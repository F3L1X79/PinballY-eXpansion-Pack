// ============================================================
// Avatar Frame list: the drawn list opened from the Profile Stats' Frame
// button to choose the Avatar Frame the active Profile wears. Select on an
// unlocked row saves it through the Profile Rewards module; Exit changes
// nothing. Both call the return given to open().
// Opens directly, not through the wheel dialog module: the player asked for it.
// - Every layer is drawn ahead from startup and kept between openings.
// - Rows that do not fit scroll with the selection and its scrollbar: those out of view stay hidden.
// - Swallows every button through "commandbuttondown" while open.
// - Opens through the shared screen opening when not drawn ahead (docs/adr/0014).
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler } from "../core/safe_handler.js";
import { createClosedListeners } from "../core/closed_listeners.js";
import { createNavigationSound } from "../core/navigation_sound.js";
import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { createSelectionMarker } from "../drawing/selection_marker.js";
import {
    AVATAR_FRAME_LIST_Z_INDEX, REFERENCE_HEIGHT, layoutFrameList, rowRectOf, thumbRectOf, drawTitle, drawRow,
} from "./avatar_frame_list_painter.js";
import { scrollbarRailRectOf, drawScrollbarRail, drawScrollbarThumb } from "../drawing/scrollbar.js";
import {
    drawBackdrop, drawExitButton, exitTooltipRectOf, drawExitTooltip, drawButtonHintsBand, EXIT_BUTTON_LOOK,
} from "../drawing/steamball_drawing.js";
import { exitButtonLookOf, exitButtonWordOf, buttonHintGroupsOf, FLIPPER_HINT } from "../drawing/button_hints.js";
import { EXIT_BUTTON, stepThroughExitButton } from "../drawing/exit_button_loop.js";
import { createScreenOpening } from "../drawing/screen_opening.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";

const SCRIPT_NAME = "AvatarFrameList";
const NONE_KEY = "none";
const EXIT_TOOLTIP = "exitTooltip";

// profileRewards: the Profile Rewards module (common/avatar_frames/profile_rewards.js);
// drawingAhead: the shared drawing ahead (common/core/drawing_ahead.js).
export function createAvatarFrameList(host, { profileStore, profileRewards, drawingAhead }) {
    const { profileStats: { frameList: TEXT } } = lang;
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    const placed = createPlacedLayers(host, { referenceHeight: REFERENCE_HEIGHT });
    // Never placed: it shows over the whole window.
    const backdropLayer = placed.create(AVATAR_FRAME_LIST_Z_INDEX.backdrop);
    // By key ("title" or a row's), each with the signature of what
    // it was drawn with.
    const layers = new Map();
    // What the list shows and its layout: null until first read. Stale once
    // something it shows may have changed, and read again ahead while the
    // list is closed.
    let content = null;
    let isContentStale = true;
    // The Exit Button's look of the last opening, drawn ahead for the next
    // one: every caller gives a return so far.
    let exitLook = EXIT_BUTTON_LOOK.BACK;
    // The open list, null when closed: the selected row's index (or
    // EXIT_BUTTON), the index of the top row shown, its Selection Marker
    // (null while getting ready), what Select and Exit return to and
    // whether it is still getting ready.
    let shown = null;
    const opening = createScreenOpening(host, SCRIPT_NAME, { zIndex: AVATAR_FRAME_LIST_Z_INDEX.backdrop - 2, drawingAhead });
    const closedListeners = createClosedListeners(SCRIPT_NAME);

    function readRows() {
        const { avatarPath } = profileStore.getActiveProfile();
        const worn = profileRewards.wornFrameOf();
        const rows = profileRewards.framesOf().map(frame => {
            const isWorn = worn !== null && worn.id === frame.id;
            return {
                key: `frame${frame.id}`, frameId: frame.id, name: frame.name, isLocked: !frame.isUnlocked, isWorn, avatarPath,
                status: frame.isUnlocked ? (isWorn ? TEXT.worn : null) : frame.unlockCondition,
                framePath: profileRewards.imageOf(frame, frame.isUnlocked ? "small" : "locked"),
            };
        });
        rows.push({
            key: NONE_KEY, frameId: null, name: TEXT.none, isLocked: false, isWorn: worn === null, avatarPath,
            status: worn === null ? TEXT.worn : null, framePath: null,
        });
        return rows;
    }

    // Reads what the list shows (rows, when already read), then draws the
    // backdrop, which measures the window the layout depends on.
    function readContent(rows = readRows()) {
        let geometry = null;
        backdropLayer.clear(STEAMBALL_COLORS.transparent);
        backdropLayer.draw(dc => {
            const size = dc.getSize();
            placed.measure(size);
            geometry = layoutFrameList(placed.referenceWidth, rows.length);
            drawBackdrop(dc, size, REFERENCE_HEIGHT, geometry.panel);
        });
        content = { rows, geometry, referenceWidth: placed.referenceWidth };
        isContentStale = false;
    }

    // Every piece: the title, the Exit Button, its tooltip, the Button
    // Hints, then each row, each { key, rect, zIndex, look, draw(dc) } in
    // its rect's own coordinates; a row also tells whether it is in view.
    function pieces() {
        const { rows, geometry } = content;
        const topIndex = shown ? shown.topIndex : 0;
        const exitWord = exitButtonWordOf(exitLook);
        const hints = buttonHintGroupsOf({ flippers: FLIPPER_HINT.BROWSE, select: true, exitLook });
        return [
            { key: "title", zIndex: AVATAR_FRAME_LIST_Z_INDEX.title, rect: geometry.title, look: TEXT.title,
                draw: dc => drawTitle(host, dc, TEXT.title, geometry.title.w, geometry.title.h) },
            { key: "exitButton", zIndex: AVATAR_FRAME_LIST_Z_INDEX.exitButton, rect: geometry.exitButton, look: exitLook,
                draw: dc => drawExitButton(dc, exitLook) },
            { key: EXIT_TOOLTIP, zIndex: AVATAR_FRAME_LIST_Z_INDEX.tooltip, rect: exitTooltipRectOf(geometry.exitButton), look: exitWord,
                draw: dc => drawExitTooltip(host, dc, exitWord) },
            { key: "buttonHints", zIndex: AVATAR_FRAME_LIST_Z_INDEX.buttonHints, rect: geometry.buttonHints, look: hints,
                draw: dc => drawButtonHintsBand(host, dc, hints, { width: geometry.buttonHints.w, height: geometry.buttonHints.h }) },
            ...rows.map((row, index) => {
                const rect = rowRectOf(geometry, index, topIndex);
                return {
                    key: row.key, zIndex: AVATAR_FRAME_LIST_Z_INDEX.rows, rect, look: row,
                    isInView: index >= topIndex && index < topIndex + geometry.rowsShown,
                    draw: dc => drawRow(host, dc, row, rect.w, rect.h),
                };
            }),
            ...scrollbarPieces(geometry.scrollbar, topIndex),
        ];
    }

    // The rail and the thumb, none when every row shows. The thumb's
    // signature leaves out its place: it is only moved as the rows scroll.
    function scrollbarPieces(bar, topIndex) {
        if (!bar) return [];
        const railRect = scrollbarRailRectOf(bar);
        const thumbRect = thumbRectOf(bar, topIndex);
        return [
            { key: "scrollbar", zIndex: AVATAR_FRAME_LIST_Z_INDEX.scrollbar, rect: railRect, look: null,
                draw: dc => drawScrollbarRail(dc, bar, { centerX: bar.centerX - railRect.x, top: bar.top - railRect.y }) },
            { key: "scrollbarThumb", zIndex: AVATAR_FRAME_LIST_Z_INDEX.scrollbarThumb, rect: thumbRect, look: null,
                draw: dc => drawScrollbarThumb(dc, thumbRect.w, thumbRect.h, bar.scale) },
        ];
    }

    const signatureOf = piece => JSON.stringify([piece.look, piece.rect.w, piece.rect.h]);
    const isDrawn = piece => {
        const record = layers.get(piece.key);
        return record !== undefined && record.signature === signatureOf(piece);
    };

    // The piece's layer, created on first use and drawn again only when its
    // signature changed.
    function layerOf(piece) {
        let record = layers.get(piece.key);
        if (!record) {
            record = { layer: placed.create(piece.zIndex), signature: null };
            layers.set(piece.key, record);
        }
        if (!isDrawn(piece)) {
            record.layer.clear(STEAMBALL_COLORS.transparent);
            record.layer.draw(piece.draw, piece.rect.w, piece.rect.h);
            record.signature = signatureOf(piece);
        }
        return record.layer;
    }

    // A row scrolled out of view stays hidden while the list is open.
    const isShowing = piece => piece.isInView !== false;
    function placeOrHide(layer, piece) {
        if (isShowing(piece)) {
            placed.place(layer, piece.rect);
            placed.show(layer);
        } else {
            placed.hide(layer);
        }
    }

    // One step of the drawing ahead. What the list shows is read again only
    // while it is closed: the open list keeps what it opened with.
    function drawAheadStep() {
        // Nothing to choose: never drawn.
        if (profileRewards.framesOf().length === 0) return false;
        if (!shown && (isContentStale || !content)) {
            readContent();
            return true;
        }
        const piece = pieces().find(candidate => !isDrawn(candidate));
        if (!piece) return false;
        layerOf(piece);
        return true;
    }

    const wakeDrawingAhead = drawingAhead.add(drawAheadStep);

    function markContentStale() {
        isContentStale = true;
        wakeDrawingAhead();
    }

    const selectedRect = () => (shown.selected === EXIT_BUTTON
        ? content.geometry.exitButton
        : rowRectOf(content.geometry, shown.selected, shown.topIndex));

    // Keeps the selected row and its neighbours in view; the rows stay
    // where they are while the Exit Button is selected.
    function scrollToSelected() {
        if (shown.selected === EXIT_BUTTON) return;
        const { rowsShown } = content.geometry;
        const before = Math.max(0, shown.selected - 1);
        const after = Math.min(content.rows.length - 1, shown.selected + 1);
        const topIndex = Math.max(Math.min(shown.topIndex, before), after - rowsShown + 1);
        shown.topIndex = Math.max(0, Math.min(content.rows.length - rowsShown, topIndex));
    }

    // Shows the list drawn for it at this opacity, the Selection Marker on
    // the selected choice.
    function show(opacity) {
        placed.show(backdropLayer);
        for (const piece of pieces()) placeOrHide(layerOf(piece), piece);
        // Not drawn ahead: it lives only while the list is open, its timer
        // with it.
        shown.marker = createSelectionMarker(host, {
            zIndex: AVATAR_FRAME_LIST_Z_INDEX.marker, referenceWidth: content.referenceWidth, referenceHeight: REFERENCE_HEIGHT,
        });
        shown.marker.moveTo(selectedRect());
        setOpacity(opacity);
    }

    // Each frame of the fade in, and each move. Every layer is drawn by
    // now: no layerOf(), which could draw on the spot within a frame. The
    // Exit Button's tooltip shows only while it is selected, a point otherwise.
    function setOpacity(opacity) {
        shown.opacity = opacity;
        backdropLayer.alpha = opacity;
        const tooltip = layers.get(EXIT_TOOLTIP).layer;
        if (shown.selected === EXIT_BUTTON) placed.show(tooltip);
        else if (placed.isShown(tooltip)) placed.hide(tooltip);
        for (const piece of pieces()) {
            const { layer } = layers.get(piece.key);
            if (isShowing(piece) && placed.isShown(layer)) layer.alpha = opacity;
        }
        shown.marker.setOpacity(opacity);
    }

    // onBack(isWornChanged): what Select and Exit return to, called once the
    // list is closed, true when the frame worn changed (null: the bare wheel,
    // the Exit Button then a cross); selectedFrameId (optional): the id of
    // the frame row it opens on instead of the worn one; onClosed (optional): called whenever it closes, attract
    // mode included, before onBack; onFailed (optional): called once an
    // opening that failed is given up. Opens at once when every row is drawn
    // ahead; otherwise the missing ones are drawn under the veil first.
    function open(onBack = null, { selectedFrameId = null, onClosed = () => {}, onFailed = () => {} } = {}) {
        if (shown) return;
        // Before anything is drawn: the Exit Button and the footer follow it.
        exitLook = exitButtonLookOf(onBack !== null);
        // Here rather than on the first move, which it would slow down.
        navigationSound.load();
        opening.begin();
        const rows = opening.read(readRows);
        // The backdrop measures the window the rows' layout depends on.
        opening.draw(() => readContent(rows));
        const isOpenedOn = row => (selectedFrameId === null ? row.isWorn : row.frameId === selectedFrameId);
        shown = {
            onBack, onClosed, marker: null, opacity: 0, selected: Math.max(0, content.rows.findIndex(isOpenedOn)), topIndex: 0, isPreparing: false,
        };
        scrollToSelected();
        const nextMissing = () => pieces().find(piece => !isDrawn(piece));
        if (!nextMissing()) {
            show(1);
            opening.logOpened();
            return;
        }
        shown.isPreparing = true;
        const step = () => {
            const piece = nextMissing();
            if (!piece) return false;
            opening.draw(() => layerOf(piece));
            return nextMissing() !== undefined;
        };
        opening.runVeiled(step, {
            onDone: () => {
                shown.isPreparing = false;
                show(0);
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

    const wornFrameId = () => {
        const worn = profileRewards.wornFrameOf();
        return worn ? worn.id : null;
    };

    // Closes the open list or gives up the one getting ready.
    function close() {
        if (!shown) return;
        const { onClosed, marker } = shown;
        shown = null;
        opening.remove();
        if (marker) marker.remove();
        placed.hide(backdropLayer);
        for (const { layer } of layers.values()) placed.hide(layer);
        // What changed while it was open is read again once it is closed.
        wakeDrawingAhead();
        onClosed();
        closedListeners.tell();
    }

    // direction: 1 for Next, -1 for Prev, through the Exit Button then
    // each row.
    function move(direction) {
        navigationSound.play();
        shown.selected = stepThroughExitButton(shown.selected, direction, content.rows.length);
        const topIndexBefore = shown.topIndex;
        scrollToSelected();
        // Every layer is drawn by now, as in setOpacity().
        if (shown.topIndex !== topIndexBefore) for (const piece of pieces()) placeOrHide(layers.get(piece.key).layer, piece);
        shown.marker.moveTo(selectedRect());
        setOpacity(shown.opacity);
    }

    function back(isWornChanged = false) {
        const { onBack } = shown;
        close();
        if (onBack) onBack(isWornChanged);
    }

    // A locked row cannot be worn: the list stays as it is. The Exit
    // Button goes back as Exit does.
    function choose() {
        if (shown.selected === EXIT_BUTTON) return back();
        const row = content.rows[shown.selected];
        if (row.isLocked) return;
        // The frame already worn changes nothing.
        const wornBefore = wornFrameId();
        profileRewards.choose(row.frameId);
        back(wornFrameId() !== wornBefore);
    }

    // Fires on every mapped button press; drives the list while it is open.
    host.on("commandbuttondown", safeHandler(SCRIPT_NAME, ev => {
        // Already handled: the Profile Stats' button opened the list within
        // the same press, which must not pick a row too.
        if (!shown || ev.defaultPrevented) return;
        // Swallowed first, so a failing choice still never reaches the wheel.
        ev.preventDefault();
        // Getting ready: Exit gives up, as it would close the open list.
        if (shown.isPreparing) {
            if (ev.command === "Exit") back();
            return;
        }
        if (ev.command === "Next" || ev.command === "Prev") move(ev.command === "Next" ? 1 : -1);
        // Launch is the plunger, which selects in PinballY's own menus too.
        else if (ev.command === "Select" || ev.command === "Launch") choose();
        else if (ev.command === "Exit") back();
    }));

    // Fires when the cabinet sits idle: the list must not stay over attract
    // mode nor keep the buttons.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, close));

    profileStore.onSwitch(safeHandler(SCRIPT_NAME, markContentStale));
    // Fires after any change of a Profile's data: the Collection Tier kept
    // or the choice may have changed.
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, markContentStale));

    return {
        open,
        isOpen: () => shown !== null,
        onClosed: closedListeners.onClosed,
        // The active Profile's frames unlocked and in all, null when there
        // are none (Table Mastery and the Profile picker off).
        count() {
            const frames = profileRewards.framesOf();
            return frames.length === 0 ? null : { unlocked: frames.filter(frame => frame.isUnlocked).length, total: frames.length };
        },
    };
}
