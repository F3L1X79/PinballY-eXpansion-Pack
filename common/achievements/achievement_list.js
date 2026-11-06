// ============================================================
// Achievement List: the drawn scrolling list of every Achievement of the
// active Profile (see docs/adr/0005), opened from the main menu or the
// Profile Stats. Unlocked ones first, then missing ones by Unlock Rate and
// Achievement Progress. Exit calls the return given to open().
// Opens directly, not through the wheel dialog module: the player asked for it.
// - Every layer is drawn ahead from startup and kept between openings, a point while hidden.
// - Swallows every button through "commandbuttondown" while open.
// - Opens at once when drawn ahead, else through the shared screen opening (docs/adr/0014).
// - isOpen() and onClosed() let the wheel dialogs wait for it.
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler } from "../core/safe_handler.js";
import { createClosedListeners } from "../core/closed_listeners.js";
import { createNavigationSound } from "../core/navigation_sound.js";
import { displayNameOf } from "../profiles/profile_name.js";
import { createScreenOpening } from "../drawing/screen_opening.js";
import { EXIT_BUTTON_LOOK, drawExitButton, drawExitTooltip } from "../drawing/steamball_drawing.js";
import { buttonHintGroupsOf, exitButtonLookOf, exitButtonWordOf, FLIPPER_HINT } from "../drawing/button_hints.js";
import { EXIT_BUTTON } from "../drawing/exit_button_loop.js";
import { createSelectionMarker } from "../drawing/selection_marker.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";
import { RANKS_IN_ORDER } from "./achievements.js";
import {
    LIST_LOOK, AVATAR_FRAME_WIDTH, computeGeometry, drawBackdrop, drawMask, drawSectionHeader, drawRow, layoutOwners, layoutRowEmblem, layoutHeaderEmblems,
    drawPiece, layoutScrollbar, SHARED_SCALE, EXIT_BUTTON_CANVAS, EXIT_TOOLTIP_CANVAS,
} from "./achievement_list_painter.js";
import { thumbTopAt, drawScrollbarThumb } from "../drawing/scrollbar.js";

const SCRIPT_NAME = "AchievementList";

// Above PinballY's menus (custom layers 6000 and above), under the
// Achievement Toast and the Profile picker. Exported for the tests' reader.
export const ACHIEVEMENT_LIST_Z_INDEX = Object.freeze({
    backdrop: 6000, items: 6001, emblems: 6002, owners: 6003, mask: 6004, headerEmblems: 6005, scrollbarThumb: 6006,
    exitButton: 6007, marker: 6009, tooltip: 6010,
});

const ITEM_KIND = Object.freeze({ SECTION: "section", ROW: "row" });
// The lines around the highlighted one, dimmed through their layer's alpha
// by their distance to it, one row or more away.
const DIMMED_ALPHA = 0.62;
// The glide slows down as it arrives (exponential ease-out).
const GLIDE_TIME_CONSTANT_MS = 40;
const GLIDE_SNAP_PX = 0.5;
const FRAME_MS = 16;
const TRANSPARENT = 0x00000000;
const ROW_PITCH = LIST_LOOK.rowHeight + LIST_LOOK.itemGap;
// Then a "+N" pill for the others.
const MAX_OWNER_AVATARS = 4;
// The file name's ending of each rank's emblem image, by where it shows.
const EMBLEM_VARIANT = Object.freeze({ UNLOCKED: "_plain", MISSING: "_missing", HEADER: "_plain" });

// drawingAhead: the shared drawing ahead (common/core/drawing_ahead.js).
export function createAchievementList(host, { getAchievements, profileStore, drawingAhead, profileRewards = null }) {
    const { achievementList: TEXT } = lang;
    // In the window's own pixels, as the geometry is.
    const placed = createPlacedLayers(host);
    const backdropLayer = placed.create(ACHIEVEMENT_LIST_Z_INDEX.backdrop);
    const mask = { layer: placed.create(ACHIEVEMENT_LIST_Z_INDEX.mask), signature: null };
    // The header's emblem images, by rank.
    const headerEmblemLayers = new Map();
    // By item key, each with the signature of what it was drawn with.
    const itemLayers = new Map();
    // The rows' emblem images and Unlock Rates, by slot and piece: item i
    // uses slot i modulo the slot count, so the items shown at once never
    // share one. An image is drawn once per slot, not per row: PinballY
    // rereads an image file on every draw, most of a row's cost.
    const pieceLayers = new Map();
    // The scrollbar's thumb: one layer, kept in a map like the others.
    const thumbLayers = new Map();
    // The Exit Button and its tooltip, by EXIT_PIECES key.
    const exitLayers = new Map();
    // The Exit Button's look of the last opening, drawn ahead for the next
    // one: every caller gives a return so far.
    let exitLook = EXIT_BUTTON_LOOK.BACK;
    const imagesFolder = `${host.getProjectFolder()}\\assets\\images`;
    // Each emblem image's path, or null when its file is missing: checked
    // once per session.
    const emblemImagePaths = new Map();

    // The window's geometry, measured on each opening and before drawing ahead.
    let geometry = null;
    // What the list shows: its items, their height and the header and
    // footer; null until first read. Stale once something it shows may
    // have changed, and read again ahead when the list is closed.
    let content = null;
    let isContentStale = true;
    // The Profiles other than Guest with their Notified Achievements, and
    // every Profile's name to notice one added or removed; null once a
    // Profile's data changed.
    let household = null;
    // The open list, null when closed: the highlighted item's index
    // (EXIT_BUTTON for the Exit Button), the scroll it glides to, what Exit
    // returns to, whether it is still getting ready and the Selection
    // Marker, there only while the Exit Button is selected.
    let shown = null;
    // Below 1 only while a list that had to get ready fades in.
    let opacity = 1;
    const opening =createScreenOpening(host, SCRIPT_NAME, { zIndex: ACHIEVEMENT_LIST_Z_INDEX.backdrop - 2, drawingAhead });
    const closedListeners = createClosedListeners(SCRIPT_NAME);
    // Where the list and the highlighted line are while gliding, in pixels.
    const glide = { scroll: 0, highlightTop: 0, timer: null, lastMs: 0 };
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);

    // The current Achievements with their live status.
    function readEntries() {
        return getAchievements().map(achievement => {
            if (!RANKS_IN_ORDER.includes(achievement.rank)) {
                throw new Error(`Achievement "${achievement.id}" has an unknown Achievement Rank "${achievement.rank}".`);
            }
            return { achievement, unlocked: achievement.checkUnlocked() };
        });
    }

    // A missing Achievement's Achievement Progress as its short text and
    // how far along it is (0 to 1), or null when it has none.
    function describeProgress(achievement, unlocked) {
        if (unlocked || typeof achievement.getProgress !== "function") return null;
        const progress = achievement.getProgress();
        if (!progress) return null;
        const unitTexts = TEXT.progressUnits[progress.unit];
        if (!unitTexts) {
            throw new Error(`Achievement "${achievement.id}" has an unknown progress unit "${progress.unit}".`);
        }
        return { text: unitTexts.short(progress.current, progress.target), ratio: progress.current / progress.target };
    }

    // The rank's emblem image for where it shows, or null when its file is
    // missing: that emblem is drawn instead.
    function emblemImageOf(rank, variant) {
        const path = `${imagesFolder}\\rank_${rank}${variant}.png`;
        if (!emblemImagePaths.has(path)) {
            const exists = host.files.fileExists(path);
            if (!exists) host.log(`[${SCRIPT_NAME}] Emblem image not found, drawing the emblem instead: ${path}`);
            emblemImagePaths.set(path, exists ? path : null);
        }
        return emblemImagePaths.get(path);
    }

    // The Profiles other than Guest, each with the Achievements it was
    // Notified of: Guest never counts in the Unlock Rate. Listing the
    // Profiles checks each Avatar file, and every Profile but the active one
    // is read from its file: only again once one may have changed.
    function readHousehold() {
        const names = profileStore.listProfileNames();
        if (!household || household.names.join("\n") !== names.join("\n")) {
            household = {
                names,
                members: profileStore.listProfiles()
                    .filter(profile => !profile.isGuest)
                    .map(profile => ({ profile, notified: new Set(profileStore.getNotifiedOf(profile.name)) })),
            };
        }
        return household.members;
    }

    // Each entry with its Achievement Progress, its Unlock Rate as the other
    // Profiles Notified of it, and its place in the definitions. The active
    // Profile is left out, so a missing Achievement it was once Notified of
    // (before the collection changed) never ranks above the Avatars shown.
    function describeEntries(entries, members) {
        const activeName = profileStore.getActiveProfile().name;
        const others = members.filter(({ profile }) => profile.name !== activeName);
        return entries.map((entry, order) => ({
            ...entry,
            order,
            progress: describeProgress(entry.achievement, entry.unlocked),
            owners: others.filter(({ notified }) => notified.has(entry.achievement.id)).map(({ profile }) => profile),
        }));
    }

    // Unlocked ones whose toast still waits first, in natural order, then
    // from the most recently Notified; the missing ones from the highest
    // Unlock Rate, then the furthest Achievement Progress, then in natural
    // order.
    function orderEntries(entries) {
        const notified = profileStore.getProfileData().notified;
        const notifiedAt = entry => notified.indexOf(entry.achievement.id);
        const unlocked = entries.filter(entry => entry.unlocked);
        const ratioOf = entry => (entry.progress ? entry.progress.ratio : 0);
        return {
            unlocked: [
                ...unlocked.filter(entry => notifiedAt(entry) === -1),
                ...unlocked.filter(entry => notifiedAt(entry) !== -1).sort((a, b) => notifiedAt(b) - notifiedAt(a)),
            ],
            // The natural order is compared too: not every engine sorts stably.
            missing: entries.filter(entry => !entry.unlocked)
                .sort((a, b) => b.owners.length - a.owners.length || ratioOf(b) - ratioOf(a) || a.order - b.order),
        };
    }

    // A row's title and description: a missing Secret Achievement shows
    // "???" and its hint instead.
    function describeTexts(achievement, unlocked) {
        if (!unlocked && typeof achievement.getHint === "function") {
            return { title: TEXT.secretTitle, description: achievement.getHint() };
        }
        return { title: achievement.getTitle(), description: achievement.getDescription() };
    }

    // What a row shows of its Unlock Rate: the Avatars of the other Profiles
    // that have it, then how many more; null when no other Profile has it.
    function describeOwners(owners) {
        if (owners.length === 0) return null;
        return {
            avatarPaths: owners.slice(0, MAX_OWNER_AVATARS).map(profile => profile.avatarPath),
            moreText: owners.length > MAX_OWNER_AVATARS ? TEXT.moreOwners(owners.length - MAX_OWNER_AVATARS) : null,
        };
    }

    // The list's items, each with its key, its top in pixels from the
    // list's start, what its layer shows and its pieces on layers of their
    // own (its emblem image and its Unlock Rate), each with its z-index and
    // whether its box is from the row's left or from its Unlock Rate's part.
    function buildItems(entries) {
        const members = readHousehold();
        const { unlocked, missing } = orderEntries(describeEntries(entries, members));
        // Nothing to compare with while there is only one Profile besides Guest.
        const showsUnlockRate = members.length > 1;
        const items = [];
        let top = 0;
        const push = item => {
            items.push({ ...item, top });
            top += item.height + LIST_LOOK.itemGap;
        };
        const sections = [["unlocked", TEXT.unlockedSection, unlocked], ["missing", TEXT.missingSection, missing]];
        for (const [sectionKey, title, sectionEntries] of sections) {
            push({
                key: `section:${sectionKey}`,
                kind: ITEM_KIND.SECTION,
                height: LIST_LOOK.sectionHeight,
                look: { title: title.toLocaleUpperCase(), count: TEXT.sectionCount(sectionEntries.length) },
                pieces: [],
            });
            for (const { achievement, unlocked: isUnlocked, progress, owners } of sectionEntries) {
                const shownOwners = showsUnlockRate ? describeOwners(owners) : null;
                const emblemImage = emblemImageOf(achievement.rank, isUnlocked ? EMBLEM_VARIANT.UNLOCKED : EMBLEM_VARIANT.MISSING);
                const pieces = [
                    ...(emblemImage ? [{ ...layoutRowEmblem(emblemImage), zIndex: ACHIEVEMENT_LIST_Z_INDEX.emblems, inOwners: false }] : []),
                    ...(shownOwners ? layoutOwners(host, shownOwners) : [])
                        .map(piece => ({ ...piece, zIndex: ACHIEVEMENT_LIST_Z_INDEX.owners, inOwners: true })),
                ];
                push({
                    key: `row:${achievement.id}`,
                    kind: ITEM_KIND.ROW,
                    height: LIST_LOOK.rowHeight,
                    look: {
                        ...describeTexts(achievement, isUnlocked),
                        rank: achievement.rank,
                        unlocked: isUnlocked,
                        hasEmblemImage: emblemImage !== null,
                        progress,
                    },
                    pieces,
                });
            }
        }
        // Without the gap after the last item, so the last row scrolls to
        // the rows area's very bottom.
        return { items, listHeight: top - LIST_LOOK.itemGap };
    }

    // The counts of the header's total line, also shown by the Profile Stats
    // so the two screens never disagree.
    function countAll(entries = readEntries()) {
        return { unlocked: entries.filter(entry => entry.unlocked).length, total: entries.length };
    }

    function describeHeader(entries) {
        const { unlocked, total } = countAll(entries);
        const percent = total === 0 ? 0 : Math.round(100 * unlocked / total);
        const profile = profileStore.getActiveProfile();
        return {
            title: TEXT.title.toLocaleUpperCase(),
            profileName: displayNameOf(profile),
            avatarPath: profile.avatarPath,
            // Only the header's Avatar: the Unlock Rate Avatars stay plain.
            framePath: profileRewards ? profileRewards.wornImageOf(profile.name, AVATAR_FRAME_WIDTH) : null,
            totalLine: TEXT.totalLine(unlocked, total, percent),
            ratio: total === 0 ? 0 : unlocked / total,
            rankCounts: RANKS_IN_ORDER.map(rank => ({
                rank,
                count: String(entries.filter(entry => entry.unlocked && entry.achievement.rank === rank).length),
                imagePath: emblemImageOf(rank, EMBLEM_VARIANT.HEADER),
            })),
        };
    }

    function readContent() {
        const entries = readEntries();
        const footer = buttonHintGroupsOf({ flippers: FLIPPER_HINT.BROWSE, select: true, exitLook });
        return { ...buildItems(entries), header: describeHeader(entries), footer };
    }

    // Draws the backdrop, which also measures the window.
    function measure() {
        backdropLayer.clear(TRANSPARENT);
        backdropLayer.draw(dc => {
            geometry = computeGeometry(dc.getSize());
            drawBackdrop(dc, geometry);
        });
        placed.measure(geometry);
    }

    // Enough slots for every item the rows area can show at once, even
    // only section headers, partly out at both ends.
    const slotCount = () => Math.ceil(geometry.areaHeight / (LIST_LOOK.sectionHeight + LIST_LOOK.itemGap)) + 2;

    // What a layer was drawn with: what it shows and its size. Its scale
    // follows the window when it is placed.
    const signatureOf = (look, width, height) => JSON.stringify([look, width, height]);

    // The layer drawn with draw(dc) at this size, created on first use and
    // drawn again only when its signature changed; a hidden one stays a point.
    function signedLayer(layers, key, zIndex, look, width, height, draw) {
        let record = layers.get(key);
        if (!record) {
            record = { layer: placed.create(zIndex), signature: null };
            layers.set(key, record);
        }
        const signature = signatureOf(look, width, height);
        if (record.signature !== signature) {
            record.layer.clear(TRANSPARENT);
            record.layer.draw(draw, width, height);
            record.signature = signature;
        }
        return record.layer;
    }

    const isDrawn = (layers, key, look, width, height) => {
        const record = layers.get(key);
        return record !== undefined && record.signature === signatureOf(look, width, height);
    };
    const isItemDrawn = item => isDrawn(itemLayers, item.key, item.look, geometry.rowWidth, item.height);

    function itemLayer(item) {
        return signedLayer(itemLayers, item.key, ACHIEVEMENT_LIST_Z_INDEX.items, item.look, geometry.rowWidth, item.height, dc => {
            if (item.kind === ITEM_KIND.SECTION) drawSectionHeader(host, dc, geometry.rowWidth, item.look);
            else drawRow(host, dc, geometry.rowWidth, item.look);
        });
    }

    const pieceKey = (index, piece) => `${index % slotCount()}|${piece.imagePath || piece.avatarPath || `+${piece.moreText}`}`;
    // Not its place in the row: the same image serves every row of its slot.
    const pieceLook = ({ imagePath, avatarPath, moreText }) => ({ imagePath, avatarPath, moreText });

    const isPieceDrawn = (index, piece) => isDrawn(pieceLayers, pieceKey(index, piece), pieceLook(piece), piece.width, piece.height);

    function pieceLayer(index, piece) {
        return signedLayer(pieceLayers, pieceKey(index, piece), piece.zIndex, pieceLook(piece), piece.width, piece.height,
            dc => drawPiece(host, dc, piece));
    }

    const headerEmblems = () => layoutHeaderEmblems(geometry, content.header.rankCounts);
    const isHeaderEmblemDrawn = emblem => isDrawn(headerEmblemLayers, emblem.rank, pieceLook(emblem), emblem.width, emblem.height);

    function headerEmblemLayer(emblem) {
        return signedLayer(headerEmblemLayers, emblem.rank, ACHIEVEMENT_LIST_Z_INDEX.headerEmblems, pieceLook(emblem), emblem.width, emblem.height,
            dc => drawPiece(host, dc, emblem));
    }

    // Null when the list fits in the rows area.
    const scrollbar = () => layoutScrollbar(geometry, content.listHeight);
    const THUMB_KEY = "thumb";
    const isThumbDrawn = bar => isDrawn(thumbLayers, THUMB_KEY, null, bar.thumbWidth, bar.thumbHeight);

    function thumbLayer(bar) {
        return signedLayer(thumbLayers, THUMB_KEY, ACHIEVEMENT_LIST_Z_INDEX.scrollbarThumb, null, bar.thumbWidth, bar.thumbHeight,
            dc => drawScrollbarThumb(dc, bar.thumbWidth, bar.thumbHeight));
    }

    // The Exit Button and its tooltip, each drawn in the reference pixels of
    // the other drawn screens and shown at its rect in the geometry.
    const EXIT_PIECES = Object.freeze({
        button: { zIndex: ACHIEVEMENT_LIST_Z_INDEX.exitButton, canvas: EXIT_BUTTON_CANVAS, draw: dc => drawExitButton(dc, exitLook) },
        tooltip: {
            zIndex: ACHIEVEMENT_LIST_Z_INDEX.tooltip, canvas: EXIT_TOOLTIP_CANVAS,
            draw: dc => drawExitTooltip(host, dc, exitButtonWordOf(exitLook)),
        },
    });
    const isExitPieceDrawn = key => isDrawn(exitLayers, key, exitLook, EXIT_PIECES[key].canvas.width, EXIT_PIECES[key].canvas.height);

    function exitLayer(key) {
        const { zIndex, canvas, draw } = EXIT_PIECES[key];
        return signedLayer(exitLayers, key, zIndex, exitLook, canvas.width, canvas.height, draw);
    }

    // The rail's place only depends on the geometry; whether it shows, on
    // whether the list overflows.
    function maskSignature() {
        return JSON.stringify([content.header, content.footer, geometry, scrollbar() !== null]);
    }

    function drawMaskLayer() {
        mask.layer.clear(TRANSPARENT);
        mask.layer.draw(dc => drawMask(host, dc, geometry, { header: content.header, footer: content.footer, scrollbar: scrollbar() }));
        mask.signature = maskSignature();
    }

    // The next of the header and footer, the Exit Button and its tooltip,
    // the header's emblems and the scrollbar's thumb to draw, as a function drawing it, or null.
    function nextChromeDrawing() {
        if (mask.signature !== maskSignature()) return drawMaskLayer;
        const exitPiece = Object.keys(EXIT_PIECES).find(key => !isExitPieceDrawn(key));
        if (exitPiece) return () => exitLayer(exitPiece);
        const headerEmblem = headerEmblems().find(emblem => !isHeaderEmblemDrawn(emblem));
        if (headerEmblem) return () => headerEmblemLayer(headerEmblem);
        const bar = scrollbar();
        if (bar && !isThumbDrawn(bar)) return () => thumbLayer(bar);
        return null;
    }

    // The next of these items (by index, in order) to draw, then its emblem
    // and Unlock Rate, as a function drawing it, or null.
    function nextItemDrawing(indexes) {
        for (const index of indexes) {
            const item = content.items[index];
            if (!isItemDrawn(item)) return () => itemLayer(item);
            const piece = item.pieces.find(candidate => !isPieceDrawn(index, candidate));
            if (piece) return () => pieceLayer(index, piece);
        }
        return null;
    }

    // The next layer to draw ahead, as a function drawing it, or null once
    // everything is drawn: the chrome, then the items from the highlighted
    // one outwards, wrapping (a wrap reaches the other end).
    function nextDrawing() {
        const { items } = content;
        const around = shown && shown.highlighted !== EXIT_BUTTON ? shown.highlighted : Math.max(0, firstRowIndex());
        const distance = index => Math.min(Math.abs(index - around), items.length - Math.abs(index - around));
        const order = items.map((item, index) => index).sort((a, b) => distance(a) - distance(b) || a - b);
        return nextChromeDrawing() || nextItemDrawing(order);
    }

    // The next layer of what the list shows on opening to draw, or null:
    // the chrome, then the items of the first screen and of the one below,
    // so that the first moves draw nothing on the spot.
    function nextFirstScreenDrawing() {
        const bottom = 2 * geometry.areaHeight;
        const indexes = [];
        content.items.forEach((item, index) => {
            if (item.top < bottom) indexes.push(index);
        });
        return nextChromeDrawing() || nextItemDrawing(indexes);
    }

    // One step of the drawing ahead. What the list shows is read again only
    // while it is closed: the open list keeps what it opened with.
    function drawAheadStep() {
        if (!shown && (isContentStale || !content)) {
            measure();
            content = readContent();
            isContentStale = false;
            return true;
        }
        const drawing = nextDrawing();
        if (!drawing) return false;
        drawing();
        return true;
    }

    const wakeDrawingAhead = drawingAhead.add(drawAheadStep);

    function markContentStale() {
        isContentStale = true;
        wakeDrawingAhead();
    }

    const hideAllExcept = (records, shownLayers) => {
        for (const { layer } of records.values()) {
            if (!shownLayers.has(layer) && placed.isShown(layer)) placed.hide(layer);
        }
    };

    // Shown at its rect, in window pixels, at this alpha.
    function showAt(layer, rect, alpha) {
        placed.place(layer, rect);
        placed.show(layer);
        layer.alpha = alpha;
    }

    // Shows the items overlapping the rows area at their place with their
    // emblem image and Unlock Rate, each dimmed by its distance to the
    // highlighted line, and hides the others; moves the scrollbar's thumb.
    // An item sliding out hides under the header or the footer. Anything
    // not drawn ahead yet is drawn on the spot.
    function placeItems() {
        const g = geometry;
        const ownersLeft = g.rowX + g.rowWidth - LIST_LOOK.ownersWidth;
        const shownLayers = new Set();
        content.items.forEach((item, index) => {
            const top = g.areaTop + item.top - glide.scroll;
            if (top + item.height <= g.areaTop || top >= g.areaTop + g.areaHeight) return;
            const layer = itemLayer(item);
            // A section header is never highlighted: always dimmed, even
            // right above the highlighted row.
            const distance = item.kind === ITEM_KIND.SECTION ? 1 : Math.min(1, Math.abs(item.top - glide.highlightTop) / ROW_PITCH);
            const alpha = opacity * (1 - (1 - DIMMED_ALPHA) * distance);
            showAt(layer, { x: g.rowX, y: top, w: g.rowWidth, h: item.height }, alpha);
            shownLayers.add(layer);
            for (const piece of item.pieces) {
                const shownPiece = pieceLayer(index, piece);
                const left = (piece.inOwners ? ownersLeft : g.rowX) + piece.x;
                showAt(shownPiece, { x: left, y: top + piece.y, w: piece.width, h: piece.height }, alpha);
                shownLayers.add(shownPiece);
            }
        });
        hideAllExcept(itemLayers, shownLayers);
        hideAllExcept(pieceLayers, shownLayers);
        placeThumb();
    }

    // At the glide's scroll, so it never moves ahead of the rows.
    function placeThumb() {
        const bar = scrollbar();
        const shownLayers = new Set();
        if (bar) {
            const layer = thumbLayer(bar);
            const rect = { x: bar.centerX - bar.thumbWidth / 2, y: thumbTopAt(bar, glide.scroll), w: bar.thumbWidth, h: bar.thumbHeight };
            showAt(layer, rect, opacity);
            shownLayers.add(layer);
        }
        hideAllExcept(thumbLayers, shownLayers);
    }

    function stopGlide() {
        host.clearInterval(glide.timer);
        glide.timer = null;
    }

    function jumpToTarget() {
        stopGlide();
        glide.scroll = shown.scroll;
        // A row's pitch above the list: every line dimmed.
        glide.highlightTop = shown.highlighted === EXIT_BUTTON ? -ROW_PITCH : content.items[shown.highlighted].top;
        placeItems();
    }

    // Runs every frame while the list glides; timed on the clock, since
    // Windows timers fire late.
    function glideStep() {
        const nowMs = host.now().getTime();
        const remaining = Math.exp(-(nowMs - glide.lastMs) / GLIDE_TIME_CONSTANT_MS);
        glide.lastMs = nowMs;
        const targetTop = content.items[shown.highlighted].top;
        glide.scroll = shown.scroll + (glide.scroll - shown.scroll) * remaining;
        glide.highlightTop = targetTop + (glide.highlightTop - targetTop) * remaining;
        if (Math.abs(glide.scroll - shown.scroll) < GLIDE_SNAP_PX && Math.abs(glide.highlightTop - targetTop) < GLIDE_SNAP_PX) {
            jumpToTarget();
            return;
        }
        placeItems();
    }

    // Keeps the items just before and after the highlighted one in view;
    // before it, an empty section's header too, above the next one's.
    function scrollToHighlighted() {
        const { items, listHeight } = content;
        const index = shown.highlighted;
        let beforeIndex = Math.max(0, index - 1);
        while (beforeIndex > 0 && items[beforeIndex].kind === ITEM_KIND.SECTION && items[beforeIndex - 1].kind === ITEM_KIND.SECTION) {
            beforeIndex--;
        }
        const before = items[beforeIndex];
        const after = items[Math.min(items.length - 1, index + 1)];
        let scroll = shown.scroll;
        if (before.top < scroll) scroll = before.top;
        if (after.top + after.height > scroll + geometry.areaHeight) scroll = after.top + after.height - geometry.areaHeight;
        shown.scroll = Math.max(0, Math.min(Math.max(0, listHeight - geometry.areaHeight), scroll));
    }

    const firstRowIndex = () => content.items.findIndex(item => item.kind === ITEM_KIND.ROW);
    const lastRowIndex = () => content.items.map(item => item.kind).lastIndexOf(ITEM_KIND.ROW);

    // direction: 1 for Next, -1 for Prev. Section headers are skipped; past
    // either end, the Exit Button is selected, the rows staying where they
    // are. Coming from it jumps instead of gliding across the whole list.
    function move(direction) {
        const { items } = content;
        if (firstRowIndex() === -1) return;
        navigationSound.play();
        if (shown.highlighted === EXIT_BUTTON) {
            shown.highlighted = direction > 0 ? firstRowIndex() : lastRowIndex();
            scrollToHighlighted();
            jumpToTarget();
            placeExitButton();
            return;
        }
        let index = shown.highlighted;
        do {
            index += direction;
        } while (index >= 0 && index < items.length && items[index].kind !== ITEM_KIND.ROW);
        if (index < 0 || index >= items.length) {
            shown.highlighted = EXIT_BUTTON;
            jumpToTarget();
            placeExitButton();
            return;
        }
        shown.highlighted = index;
        scrollToHighlighted();
        if (glide.timer === null) {
            glide.lastMs = host.now().getTime();
            glide.timer = host.setInterval(safeHandler(SCRIPT_NAME, glideStep), FRAME_MS);
        }
    }

    // The Exit Button at its place, and while it is selected its tooltip and
    // the Selection Marker round it; drawn on the spot if not drawn ahead.
    function placeExitButton() {
        const isSelected = shown.highlighted === EXIT_BUTTON;
        showAt(exitLayer("button"), geometry.exitButton, opacity);
        const tooltipLayer = exitLayer("tooltip");
        if (isSelected) showAt(tooltipLayer, geometry.exitTooltip, opacity);
        else if (placed.isShown(tooltipLayer)) placed.hide(tooltipLayer);
        if (isSelected && !shown.marker) {
            // In the shared reference pixels, so it looks as on the other screens.
            shown.marker = createSelectionMarker(host, {
                zIndex: ACHIEVEMENT_LIST_Z_INDEX.marker, referenceWidth: geometry.width * SHARED_SCALE, referenceHeight: geometry.height * SHARED_SCALE,
            });
            const { x, y, w, h } = geometry.exitButton;
            shown.marker.moveTo({ x: x * SHARED_SCALE, y: y * SHARED_SCALE, w: w * SHARED_SCALE, h: h * SHARED_SCALE });
        } else if (!isSelected && shown.marker) {
            removeMarker();
        }
        if (shown.marker) shown.marker.setOpacity(opacity);
    }

    function removeMarker() {
        shown.marker.remove();
        shown.marker = null;
    }

    // Over the mask at their place; drawn on the spot if not drawn ahead.
    function showHeaderEmblems() {
        const shownLayers = new Set();
        for (const emblem of headerEmblems()) {
            const layer = headerEmblemLayer(emblem);
            showAt(layer, { x: emblem.x, y: emblem.y, w: emblem.width, h: emblem.height }, opacity);
            shownLayers.add(layer);
        }
        hideAllExcept(headerEmblemLayers, shownLayers);
    }

    // Shows the list drawn for it.
    function show() {
        for (const layer of [backdropLayer, mask.layer]) {
            placed.show(layer);
            layer.alpha = opacity;
        }
        showHeaderEmblems();
        jumpToTarget();
        placeExitButton();
    }

    // Each frame of the fade in; leaves a glide the player started going.
    function setOpacity(newOpacity) {
        opacity = newOpacity;
        backdropLayer.alpha = opacity;
        mask.layer.alpha = opacity;
        showHeaderEmblems();
        placeItems();
        placeExitButton();
    }

    // onExit: what Exit returns to, called once the list is closed (null:
    // the bare wheel, the Exit Button then a cross); onFailed: called once
    // an opening given up on a failing drawing is closed.
    function open(onExit = null, { onFailed = () => {} } = {}) {
        // Before the content is read: the Exit Button and the footer follow it.
        exitLook = exitButtonLookOf(onExit !== null);
        // A native menu left open would sit over or under the list.
        if (host.getUIMode() === "menu") host.doCommand(host.getBuiltInCommand("MenuReturn"));
        stopGlide();
        // Here rather than on the first move, which it would slow down.
        navigationSound.load();
        opening.begin();
        content = opening.read(readContent);
        isContentStale = false;
        // Drawn: only what was not drawn ahead yet.
        opening.draw(measure);
        // On the Exit Button, the list at its top: Next reaches the first row.
        shown = { onExit, scroll: 0, highlighted: EXIT_BUTTON, isPreparing: false, marker: null };
        if (!nextFirstScreenDrawing()) {
            show();
            opening.logOpened();
            return;
        }
        shown.isPreparing = true;
        const step = () => {
            const drawing = nextFirstScreenDrawing();
            if (!drawing) return false;
            opening.draw(drawing);
            return nextFirstScreenDrawing() !== null;
        };
        opening.runVeiled(step, {
            onDone: () => {
                shown.isPreparing = false;
                opacity = 0;
                show();
                opening.logOpened();
                opening.fadeIn(setOpacity);
            },
            // Logged by the drawing ahead: given up rather than left veiled.
            onFailed: () => {
                close();
                onFailed();
            },
        });
    }

    // Closes the open list or gives up the one getting ready.
    function close() {
        if (!shown) return;
        opening.remove();
        opacity = 1;
        stopGlide();
        if (shown.marker) removeMarker();
        shown = null;
        for (const layer of [backdropLayer, mask.layer]) placed.hide(layer);
        for (const layers of [itemLayers, pieceLayers, headerEmblemLayers, thumbLayers, exitLayers]) hideAllExcept(layers, new Set());
        // What changed while it was open is read again once it is closed.
        wakeDrawingAhead();
        closedListeners.tell();
    }

    // Fires on every mapped button press; drives the list while it is open.
    host.on("commandbuttondown", safeHandler(SCRIPT_NAME, ev => {
        // Already handled: the Drawn Menu's or Profile Stats' Select opens
        // the list within the same press, which must not reach its Exit Button.
        if (!shown || ev.defaultPrevented) return;
        // Swallowed first, so a failing move still never reaches the wheel.
        ev.preventDefault();
        const isOnExitButton = !shown.isPreparing && shown.highlighted === EXIT_BUTTON;
        if ((ev.command === "Next" || ev.command === "Prev") && !shown.isPreparing) {
            move(ev.command === "Next" ? 1 : -1);
        } else if (ev.command === "Exit" || (isOnExitButton && (ev.command === "Select" || ev.command === "Launch"))) {
            const { onExit } = shown;
            close();
            if (onExit) onExit();
        }
    }));

    // Fires when the cabinet sits idle: the list must not stay drawn over
    // attract mode or keep the buttons.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, close));

    // A switch changes what the list shows, and the Notified Achievements
    // of the Profile left may have changed while it was active.
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => {
        household = null;
        markContentStale();
    }));

    // Fires after any change of a Profile's data: the active one's plays
    // change the Unlocked status and Achievement Progress; another one's
    // can only be its Notified Achievements, for a toast shown after a switch.
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, profileName => {
        if (profileName !== profileStore.getActiveProfile().name) household = null;
        markContentStale();
    }));

    return { open, isOpen: () => shown !== null, onClosed: closedListeners.onClosed, countAll: () => countAll() };
}
