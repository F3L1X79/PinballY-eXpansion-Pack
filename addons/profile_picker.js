// ============================================================
// Profile picker: "Change Player" (main menu, exit menu, Welcome Screen),
// or the Startup Screen, opens a drawn carousel of the Profiles' Avatars;
// Select or Launch switches Profile, Exit closes it; its last slot, the "+",
// opens Name Entry. Also shows the active Profile's badge at the top right of
// the wheel, and greets the Profile on each pick when the Welcome Screen is off.
// - As the Startup Screen only, a drawn dialog of the wheel dialog module, which the Welcome Screen follows.
// - Swallows every button through "commandbuttondown" while open.
// - Layers are drawn ahead and kept: each draw blocks PinballY 20 to 45 ms on the cabinet.
// - The startup greeting waits for a wheel free of menus, screens and dialogs.
// - Holds the quiet wheel while open, until the Welcome Screen that follows takes it (docs/adr/0015).
// ============================================================

import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { displayNameOf } from "../common/profiles/profile_name.js";
import { seesSetupEntries } from "../common/profiles/setup_entries.js";
import { createNameEntry } from "../common/profiles/name_entry.js";
import { getMainMenu, MAIN_MENU_POSITION } from "../common/menus/main_menu.js";
import { getWheelDialogs, DIALOG_PRIORITY } from "../common/core/wheel_dialog.js";
import { getStartupScreen, notifyStartupPickerDone, STARTUP_SCREEN } from "../common/core/startup_screen.js";
import { getStartupVeil } from "../common/drawing/startup_veil.js";
import { getQuietWheel } from "../common/core/quiet_wheel.js";
import { registerChangePlayer } from "../common/profiles/change_player.js";
import { drawShadowedText } from "../common/drawing/shadowed_text.js";
import { STEAMBALL_COLORS } from "../common/drawing/steamball_palette.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { getShownPlayerLevel } from "../common/levels/shown_player_level.js";
import { drawLevelPip, levelPipOn, drawAvatarFrame, avatarFrameSide, AVATAR_FRAME_MARGIN } from "../common/drawing/steamball_drawing.js";
import { getProfileRewards } from "../common/avatar_frames/profile_rewards.js";
import { createNavigationSound } from "../common/core/navigation_sound.js";
import { createWindowWatch, readViewSize, sameSize, sizeText } from "../common/core/window_watch.js";
import config from "../common/core/config.js";

const SCRIPT_NAME = "ProfilePicker";

// Above PinballY's menus and popups; the Avatars above the carousel's
// background, the gold frame and the names above the Avatars.
const PICKER_Z_INDEX = 6500;
const AVATAR_Z_INDEX = 6501;
const TOP_Z_INDEX = 6502;
// Above the gold frame, which runs under the pip's corner.
const PIP_Z_INDEX = 6503;
// Above the wheel and the game info box, under popups and menus.
const BADGE_Z_INDEX = 4500;
const COLORS = Object.freeze({
    overlay: 0xD0080A0E,
    gold: 0xFFE8B84A,
    neighbourFrame: 0xFF3E4C60,
    text: 0xFFFFFFFF,
    hint: 0xFFA9B4C2,
    transparent: 0x00000000,
});
// By distance from the highlighted Avatar: its size, how much it is
// dimmed (the alpha of a black veil) and how far its centre sits from the
// middle, farther apart while an Avatar Frame is worn in the carousel, so
// no frame overlaps the next. The last one is where an Avatar goes past
// the last slot while gliding: smaller, farther and fully dark, so one
// entering from the edge fades in.
const SLOTS = Object.freeze([
    { size: 220, dim: 0, centerOffset: { plain: 0, framed: 0 } },
    { size: 130, dim: 0x70000000, centerOffset: { plain: 210, framed: 275 } },
    { size: 80, dim: 0xA0000000, centerOffset: { plain: 340, framed: 445 } },
    { size: 40, dim: 0xFF000000, centerOffset: { plain: 420, framed: 530 } },
]);
const SHOWN_SLOT_COUNT = 3;
// The glide slows down as it arrives (exponential ease-out): about 200 ms.
const GLIDE_TIME_CONSTANT_MS = 50;
const GLIDE_SNAP = 0.02;
// An Avatar layer's canvas: the image at the greeting's grown size, so it
// is only ever scaled down, in its plain frame. The gold frame is a ring on
// a layer of its own, wide enough to cover the highlighted one's plain frame.
const AVATAR_ART = Object.freeze({ image: 260, goldFrame: 5, plainFrame: 2 });
// An Avatar wearing an Avatar Frame has no plain frame: its canvas is the
// Avatar Frame's, and the gold frame goes around it.
const AVATAR_SIDE = AVATAR_ART.image + 2 * AVATAR_ART.plainFrame;
const FRAMED_AVATAR_SIDE = avatarFrameSide(AVATAR_ART.image);
const GOLD_FRAME_SIDE = AVATAR_ART.image + 2 * AVATAR_ART.goldFrame;
const FRAMED_GOLD_FRAME_SIDE = FRAMED_AVATAR_SIDE + 2 * AVATAR_ART.goldFrame;
// A carousel pip's canvas: as high as the pip, wide enough for four digits.
// Smaller than elsewhere, as several Avatars share the row.
const PIP_ART = levelPipOn(0, 0, AVATAR_SIDE, 1 / 5);
const PIP_CANVAS = Object.freeze({ width: 2 * PIP_ART.size, height: PIP_ART.size });
// The Avatars' row sits at this fraction of the height; the texts are
// placed from it.
const ROW_HEIGHT_RATIO = 0.4;
const TITLE = Object.freeze({ size: 26, weight: 700, top: -250 });
const NAME = Object.freeze({ size: 24, weight: 700, top: 130 });
// A name layer's height: the text and its shadow.
const NAME_LAYER_HEIGHT = 48;
const HINT = Object.freeze({ size: 12, weight: 400, top: 180 });
// How far the name and the hint move down while an Avatar Frame is worn
// in the carousel, below the highlighted Avatar's frame.
const FRAMED_TEXT_SHIFT = 45;
// The badge has its own canvas, pinned to the window's top right corner:
// PinballY stretches a canvas to the window, and gives the window its
// final size only after the scripts' init, so a window-sized canvas drawn
// at startup ends up distorted.
// The name is centred under the Avatar, across the canvas width, which also
// leaves the Avatar ~30 px from the right edge.
// The level pip straddles the Avatar's bottom-right corner; the name sits
// low enough to clear the pip's lower half, or under the worn Avatar
// Frame, which gives the gold frame its place. The canvas is tall enough
// for that lower name.
const BADGE = Object.freeze({ width: 160, height: 184, avatarSize: 96, frame: 3, top: 30, nameGap: 14, framedNameGap: 4 });
const BADGE_FRAME_SIDE = avatarFrameSide(BADGE.avatarSize);
// The size validated on the cabinet's 1920 px high playfield, kept in
// proportion to the window's height on any other window.
const BADGE_REFERENCE_HEIGHT = 1920;
const BADGE_NAME = Object.freeze({ size: 14, weight: 600 });
// After a pause, the greeted Avatar grows from the highlighted size, holds,
// then everything fades out: about 1.5 s once started.
const GREETING = Object.freeze({ delayMs: 500, grownSize: 260, growMs: 250, holdMs: 700, fadeMs: 550 });
const GREETING_TEXT = Object.freeze({ size: 28, weight: 700, gap: 24 });
const FRAME_MS = 16;
// The "+" slot, last of the carousel, which opens Name Entry. Not a Profile:
// a symbol keys its layers, so a folder named "+" keeps its own.
const NEW_PROFILE_SLOT = Object.freeze({ name: Symbol("new profile slot") });
const NEW_PROFILE_ART = Object.freeze({ background: STEAMBALL_COLORS.tile, armLength: 120, armWidth: 20 });

export default function init() {
    const { profiles: TEXT } = lang;
    const host = createPinballYHost();
    const profileStore = getProfileStore();
    const shownPlayerLevel = getShownPlayerLevel();
    const profileRewards = getProfileRewards();
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    // Before this Add-on's own button listener, which then sees each press
    // Name Entry took as handled.
    const nameEntry = createNameEntry(host, { profileStore, drawingAhead: getDrawingAhead() });
    const hiddenLayer = zIndex => {
        const layer = host.createDrawingLayer(zIndex);
        layer.alpha = 0;
        return layer;
    };
    // The carousel's overlay, title and hint, drawn ahead; the greeting's
    // overlay and text, drawn when it starts.
    const backLayer = hiddenLayer(PICKER_Z_INDEX);
    const greetingLayer = hiddenLayer(PICKER_Z_INDEX);
    // The gold frame around a plain Avatar, and around an Avatar Frame.
    const goldFrames = {
        plain: { layer: hiddenLayer(TOP_Z_INDEX), side: GOLD_FRAME_SIDE, isDrawn: false },
        framed: { layer: hiddenLayer(TOP_Z_INDEX), side: FRAMED_GOLD_FRAME_SIDE, isDrawn: false },
    };
    const badgeLayer = host.createDrawingLayer(BADGE_Z_INDEX);
    badgeLayer.setScale({ ySpan: BADGE.height / BADGE_REFERENCE_HEIGHT });
    badgeLayer.setPos(0, 0, "top right");

    // The slots shown (the Profiles, then the "+" for whoever sees it) and
    // the highlighted one's index; null when closed.
    let slots = null;
    let highlighted = 0;
    // The window's layout size, taken from the background layer, which
    // spans the whole window: the other layers are placed in its pixels.
    let layout = null;
    // The view's size when the background measured the window: drawn ahead,
    // it may have been measured before PinballY laid the window out.
    let layoutView = null;
    // Runs while the carousel is open.
    const windowWatch = createWindowWatch(host, SCRIPT_NAME);
    // By Profile name, the image of the Avatar Frame it wears (null for
    // none), read with the Profiles: the carousel places its layers on
    // every frame of a glide, and other Profiles' data is read from file.
    let framePaths = new Map();
    // Whether the carousel's background was drawn for an Avatar Frame worn.
    let isMeasuredFramed = false;
    // By Profile name, each with the signature of what it was drawn with.
    const avatarLayers = new Map();
    const nameLayers = new Map();
    const pipLayers = new Map();
    // The slots to draw ahead, and whether the window must be measured and
    // the Profiles read again first.
    let aheadSlots = [];
    let isAheadStale = true;
    // How far, in slots, the Avatars still sit from their places while they
    // glide (positive: to the right); 0 at rest.
    let glide = 0;
    let glideTimer = null;
    let glideLastMs = 0;
    // The pause before the greeting and its animation frames; null when idle.
    let greetingDelayTimer = null;
    let greetingTimer = null;
    // The Welcome Screen already greets the Profile by name, at startup and
    // after a switch: a second greeting right after it would be too much.
    const isWelcomeScreenOn = config.addOns.startupChoicePrompt !== false;
    const startupScreen = getStartupScreen();
    let startupGreetingPending = startupScreen === STARTUP_SCREEN.WHEEL;
    const startupVeil = getStartupVeil();
    const quietWheel = getQuietWheel();
    // The startup carousel's close in the wheel dialog module, from its
    // turn until a pick, Exit or a drop.
    let closeStartupDialog = null;
    // From startup until the startup carousel is left or dropped.
    let isStartupPending = startupScreen === STARTUP_SCREEN.PROFILE_PICKER;
    // A sound that cannot play is logged and never stops the greeting.
    const playGreetingSound = safeHandler(SCRIPT_NAME, () => {
        if (config.profileGreetingSoundFile) host.playSound(config.profileGreetingSoundFile);
    });
    // A sound that cannot play is logged and never stops the carousel. The
    // greeting after a quick pick may cut it: wanted.
    const playPickerSound = safeHandler(SCRIPT_NAME, () => {
        if (config.profilePickerSoundFile) host.playSound(config.profilePickerSoundFile);
    });

    function readProfiles() {
        const listed = profileStore.listProfiles();
        framePaths = new Map(listed.map(profile => [profile.name, profileRewards.wornImageOf(profile.name, FRAMED_AVATAR_SIDE)]));
        return listed;
    }

    // The Profiles read afresh, then the "+" for whoever sees the setup entries.
    const readSlots = () => [...readProfiles(), ...(seesSetupEntries(profileStore) ? [NEW_PROFILE_SLOT] : [])];

    const framePathOf = profile => framePaths.get(profile.name) || null;
    const isFramed = () => [...framePaths.values()].some(path => path !== null);
    const textShift = () => (isFramed() ? FRAMED_TEXT_SHIFT : 0);

    // Slot offsets drawn around the highlighted Avatar, farthest first, so
    // each Profile shows once and the nearer ones cover the farther ones.
    function neighbourOffsets(count) {
        const others = count - 1;
        const right = Math.min(SHOWN_SLOT_COUNT - 1, Math.ceil(others / 2));
        const left = Math.min(SHOWN_SLOT_COUNT - 1, Math.floor(others / 2));
        const offsets = [];
        for (let distance = SHOWN_SLOT_COUNT - 1; distance >= 1; distance--) {
            if (distance <= left) offsets.push(-distance);
            if (distance <= right) offsets.push(distance);
        }
        return offsets;
    }

    // The look of an Avatar at a fractional slot position, blended between
    // the two slots around it.
    function slotAt(position) {
        const look = isFramed() ? "framed" : "plain";
        const distance = Math.abs(position);
        const index = Math.min(SHOWN_SLOT_COUNT - 1, Math.floor(distance));
        const from = SLOTS[index];
        const to = SLOTS[index + 1];
        const ratio = Math.min(1, distance - index);
        const blend = (a, b) => a + (b - a) * ratio;
        return {
            size: blend(from.size, to.size),
            centerOffset: Math.sign(position) * blend(from.centerOffset[look], to.centerOffset[look]),
            opacity: 1 - blend(from.dim >>> 24, to.dim >>> 24) / 0xFF,
        };
    }

    // The places shown around the highlighted Avatar; while gliding, the
    // Avatar leaving past the last slot too, when it is not already shown
    // on the other side. The Avatars never overlap, so their order doesn't
    // matter.
    function shownOffsets(count) {
        const offsets = [...neighbourOffsets(count), 0];
        if (glide !== 0 && count > 2 * SHOWN_SLOT_COUNT - 1) offsets.push(-Math.sign(glide) * SHOWN_SLOT_COUNT);
        return offsets;
    }

    // The layer kept for key in layers, drawn again only when its signature
    // changed.
    function signedLayer(layers, key, zIndex, signature, width, height, draw) {
        let record = layers.get(key);
        if (!record) {
            record = { layer: hiddenLayer(zIndex), signature: null };
            layers.set(key, record);
        }
        if (record.signature !== signature) {
            record.layer.clear(COLORS.transparent);
            record.layer.draw(draw, width, height);
            record.signature = signature;
        }
        return record.layer;
    }

    const isDrawn = (layers, key, signature) => layers.has(key) && layers.get(key).signature === signature;
    const avatarSignature = profile => JSON.stringify([profile.avatarPath, framePathOf(profile)]);
    const avatarSideOf = profile => (framePathOf(profile) ? FRAMED_AVATAR_SIDE : AVATAR_SIDE);
    const isActive = profile => profile.name === profileStore.getActiveProfile().name;
    const slotNameOf = slot => (slot === NEW_PROFILE_SLOT ? TEXT.newProfile : displayNameOf(slot));
    // The canvas spans the window's width.
    const nameSignature = profile => JSON.stringify([slotNameOf(profile), isActive(profile), layout.width, layout.height]);
    const levelOf = slot => (slot === NEW_PROFILE_SLOT ? null : shownPlayerLevel.getOf(slot.name));

    function drawNewProfileArt(dc, side) {
        const { background, armLength, armWidth } = NEW_PROFILE_ART;
        const frame = AVATAR_ART.plainFrame;
        dc.fillRect(0, 0, side, side, COLORS.neighbourFrame);
        dc.fillRect(frame, frame, side - 2 * frame, side - 2 * frame, background);
        dc.fillRect((side - armLength) / 2, (side - armWidth) / 2, armLength, armWidth, COLORS.text);
        dc.fillRect((side - armWidth) / 2, (side - armLength) / 2, armWidth, armLength, COLORS.text);
    }

    function avatarLayer(profile) {
        const framePath = framePathOf(profile);
        const side = avatarSideOf(profile);
        return signedLayer(avatarLayers, profile.name, AVATAR_Z_INDEX, avatarSignature(profile), side, side, dc => {
            if (profile === NEW_PROFILE_SLOT) {
                drawNewProfileArt(dc, side);
                return;
            }
            if (!framePath) {
                dc.fillRect(0, 0, side, side, COLORS.neighbourFrame);
                dc.drawImage(profile.avatarPath, AVATAR_ART.plainFrame, AVATAR_ART.plainFrame, AVATAR_ART.image, AVATAR_ART.image);
                return;
            }
            const margin = AVATAR_ART.image * AVATAR_FRAME_MARGIN;
            dc.fillRect(margin, margin, AVATAR_ART.image, AVATAR_ART.image, COLORS.neighbourFrame);
            dc.drawImage(profile.avatarPath, margin, margin, AVATAR_ART.image, AVATAR_ART.image);
            drawAvatarFrame(dc, framePath, margin, margin, AVATAR_ART.image);
        });
    }

    // null when the Profile has no level to show.
    function pipLayer(profile) {
        const level = levelOf(profile);
        if (level === null) return null;
        return signedLayer(pipLayers, profile.name, PIP_Z_INDEX, String(level), PIP_CANVAS.width, PIP_CANVAS.height, dc => {
            drawLevelPip(host, dc, level, PIP_CANVAS.width / 2, PIP_CANVAS.height / 2, PIP_ART.size);
        });
    }

    function nameLayer(profile) {
        return signedLayer(nameLayers, profile.name, TOP_Z_INDEX, nameSignature(profile), layout.width, NAME_LAYER_HEIGHT, dc => {
            drawShadowedText(host, dc, NAME, isActive(profile) ? COLORS.gold : COLORS.text, slotNameOf(profile), 0);
        });
    }

    function drawGoldFrame(goldFrame) {
        const { layer, side } = goldFrame;
        const band = AVATAR_ART.goldFrame;
        layer.clear(COLORS.transparent);
        layer.draw(dc => {
            dc.fillRect(0, 0, side, band, COLORS.gold);
            dc.fillRect(0, side - band, side, band, COLORS.gold);
            dc.fillRect(0, band, band, side - 2 * band, COLORS.gold);
            dc.fillRect(side - band, band, band, side - 2 * band, COLORS.gold);
        }, side, side);
        goldFrame.isDrawn = true;
    }

    // Centres a layer drawn around an Avatar's image on (x, y), in layout
    // pixels, the image size pixels wide.
    function placeAroundImage(layer, canvasSide, x, y, size, opacity) {
        const side = size * canvasSide / AVATAR_ART.image;
        layer.setScale({ ySpan: side / layout.height });
        layer.setPos(x / layout.width - 0.5, 0.5 - y / layout.height);
        layer.alpha = opacity;
    }

    function placeAvatar(profile, x, y, size, opacity, gold) {
        placeAroundImage(avatarLayer(profile), avatarSideOf(profile), x, y, size, opacity);
        placePip(profile, x, y, size, opacity);
        if (!gold) return;
        const shown = framePathOf(profile) ? goldFrames.framed : goldFrames.plain;
        const hidden = shown === goldFrames.framed ? goldFrames.plain : goldFrames.framed;
        if (hidden.layer.alpha !== 0) hidden.layer.alpha = 0;
        if (!shown.isDrawn) drawGoldFrame(shown);
        placeAroundImage(shown.layer, shown.side, x, y, size, opacity);
    }

    // On the Avatar's corner, scaled with it.
    function placePip(profile, x, y, size, opacity) {
        const layer = pipLayer(profile);
        if (!layer) return;
        const scale = size / AVATAR_ART.image;
        const offset = (PIP_ART.cx - AVATAR_SIDE / 2) * scale;
        layer.setScale({ ySpan: PIP_CANVAS.height * scale / layout.height });
        layer.setPos((x + offset) / layout.width - 0.5, 0.5 - (y + offset) / layout.height);
        layer.alpha = opacity;
    }

    const hideAll = records => {
        for (const { layer } of records.values()) {
            if (layer.alpha !== 0) layer.alpha = 0;
        }
    };

    function hideCarousel() {
        backLayer.alpha = 0;
        goldFrames.plain.layer.alpha = 0;
        goldFrames.framed.layer.alpha = 0;
        hideAll(avatarLayers);
        hideAll(nameLayers);
        hideAll(pipLayers);
    }

    // The highlighted name, once the Avatars are at rest.
    function placeName() {
        const current = glide === 0 ? slots[highlighted] : null;
        for (const [name, { layer }] of nameLayers) {
            if ((!current || name !== current.name) && layer.alpha !== 0) layer.alpha = 0;
        }
        if (!current) return;
        const layer = nameLayer(current);
        const top = layout.height * ROW_HEIGHT_RATIO + NAME.top + textShift();
        layer.setScale({ ySpan: NAME_LAYER_HEIGHT / layout.height });
        layer.setPos(0, 0.5 - (top + NAME_LAYER_HEIGHT / 2) / layout.height);
        layer.alpha = 1;
    }

    // Runs on every frame of a glide: shows, moves and hides layers only.
    function placeCarousel() {
        const count = slots.length;
        const centerY = layout.height * ROW_HEIGHT_RATIO;
        const shownSlots = new Map(shownOffsets(count)
            .map(offset => [slots[((highlighted + offset) % count + count) % count], offset]));
        const shownNames = new Set([...shownSlots.keys()].map(slot => slot.name));
        for (const records of [avatarLayers, pipLayers]) {
            for (const [name, { layer }] of records) {
                if (!shownNames.has(name) && layer.alpha !== 0) layer.alpha = 0;
            }
        }
        for (const [slot, offset] of shownSlots) {
            const look = slotAt(offset + glide);
            placeAvatar(slot, layout.width / 2 + look.centerOffset, centerY, look.size, look.opacity, offset === 0);
        }
        placeName();
    }

    // Draws the carousel's background, which also measures the window,
    // for the Profiles read last.
    function measure() {
        isMeasuredFramed = isFramed();
        layoutView = readViewSize(host, SCRIPT_NAME);
        backLayer.clear(COLORS.transparent);
        backLayer.draw(dc => {
            layout = dc.getSize();
            dc.fillRect(0, 0, layout.width, layout.height, COLORS.overlay);
            const centerY = layout.height * ROW_HEIGHT_RATIO;
            drawShadowedText(host, dc, TITLE, COLORS.text, TEXT.pickerTitle, centerY + TITLE.top);
            drawShadowedText(host, dc, HINT, COLORS.hint, TEXT.pickerHint, centerY + HINT.top + textShift());
        });
    }

    const isShowing = () => slots !== null || greetingDelayTimer !== null || greetingTimer !== null;

    // One step of the drawing ahead, only while nothing is shown, so it
    // never makes the carousel or the greeting stutter: the Profiles are
    // read again and the background drawn (which measures the window), the
    // gold frames, then each Profile's Avatar and name.
    function drawAheadStep() {
        if (isShowing()) return false;
        if (isAheadStale) {
            aheadSlots = readSlots();
            measure();
            isAheadStale = false;
            return true;
        }
        for (const goldFrame of Object.values(goldFrames)) {
            if (!goldFrame.isDrawn) {
                drawGoldFrame(goldFrame);
                return true;
            }
        }
        for (const slot of aheadSlots) {
            if (!isDrawn(avatarLayers, slot.name, avatarSignature(slot))) {
                avatarLayer(slot);
                return true;
            }
            if (!isDrawn(nameLayers, slot.name, nameSignature(slot))) {
                nameLayer(slot);
                return true;
            }
            const level = levelOf(slot);
            if (level !== null && !isDrawn(pipLayers, slot.name, String(level))) {
                pipLayer(slot);
                return true;
            }
        }
        return false;
    }

    const wakeDrawingAhead = getDrawingAhead().add(drawAheadStep);

    // The window may have been resized, and Profiles or their Avatars
    // changed, since the last drawing ahead.
    function markAheadStale() {
        isAheadStale = true;
        wakeDrawingAhead();
    }

    // The worn Avatar Frame's image the badge was drawn with.
    let badgeFramePath = null;

    function drawBadge() {
        const profile = profileStore.getActiveProfile();
        const framePath = profileRewards.wornImageOf(profile.name, BADGE_FRAME_SIDE);
        badgeFramePath = framePath;
        badgeLayer.clear(COLORS.transparent);
        badgeLayer.draw(dc => {
            const { width, avatarSize, frame, top, nameGap, framedNameGap } = BADGE;
            const x = (width - avatarSize) / 2;
            if (!framePath) dc.fillRect(x - frame, top - frame, avatarSize + 2 * frame, avatarSize + 2 * frame, COLORS.gold);
            dc.drawImage(profile.avatarPath, x, top, avatarSize, avatarSize);
            drawAvatarFrame(dc, framePath, x, top, avatarSize);
            const level = shownPlayerLevel.get();
            if (level !== null) {
                const pip = levelPipOn(x - frame, top - frame, avatarSize + 2 * frame);
                drawLevelPip(host, dc, level, pip.cx, pip.cy, pip.size);
            }
            const nameTop = framePath ? top + avatarSize + avatarSize * AVATAR_FRAME_MARGIN + framedNameGap : top + avatarSize + nameGap;
            drawShadowedText(host, dc, BADGE_NAME, COLORS.text, displayNameOf(profile), nameTop);
        }, BADGE.width, BADGE.height);
    }

    // The greeting's background: overlay and greeting text, placed under
    // the Avatar at its grown size, or under its Avatar Frame.
    function drawGreetingBack(profile) {
        greetingLayer.clear(COLORS.transparent);
        greetingLayer.alpha = 1;
        greetingLayer.draw(dc => {
            layout = dc.getSize();
            dc.fillRect(0, 0, layout.width, layout.height, COLORS.overlay);
            const grownSide = framePathOf(profile) ? avatarFrameSide(GREETING.grownSize) : GREETING.grownSize;
            const textTop = layout.height * ROW_HEIGHT_RATIO + grownSide / 2 + GREETING_TEXT.gap;
            drawShadowedText(host, dc, GREETING_TEXT, COLORS.text, TEXT.greeting(displayNameOf(profile)), textTop);
        });
    }

    // Stops the pause or the greeting, and hides it with the carousel,
    // whose Avatar and gold frame it shares.
    function stopGreeting() {
        host.clearTimeout(greetingDelayTimer);
        greetingDelayTimer = null;
        host.clearInterval(greetingTimer);
        greetingTimer = null;
        greetingLayer.alpha = 0;
        hideCarousel();
        wakeDrawingAhead();
    }

    // The Avatar grows and everything fades by moving, scaling and fading
    // the layers: nothing is redrawn once the greeting has started.
    function greet(profile) {
        stopGreeting();
        // The worn frames may have changed since the Profiles were last read.
        readProfiles();
        const startSize = SLOTS[0].size;
        const { grownSize, growMs, holdMs, fadeMs } = GREETING;
        drawGreetingBack(profile);
        const centerX = layout.width / 2;
        const centerY = layout.height * ROW_HEIGHT_RATIO;
        placeAvatar(profile, centerX, centerY, startSize, 1, true);
        // Timed on the clock: Windows timers fire late, so counting frames
        // would stretch the greeting.
        const startMs = host.now().getTime();
        greetingTimer = host.setInterval(safeHandler(SCRIPT_NAME, () => {
            const elapsed = host.now().getTime() - startMs;
            if (elapsed >= growMs + holdMs + fadeMs) {
                stopGreeting();
                return;
            }
            const size = startSize + (grownSize - startSize) * Math.min(1, elapsed / growMs);
            const opacity = 1 - Math.max(0, elapsed - growMs - holdMs) / fadeMs;
            placeAvatar(profile, centerX, centerY, size, opacity, true);
            greetingLayer.alpha = opacity;
        }), FRAME_MS);
        playGreetingSound();
    }

    // A Drawn Menu or a drawn screen leaves the UI mode on the wheel.
    const isWheelFree = () => host.getUIMode() === "wheel" && !getWheelDialogs().isOverlayOpen() && getWheelDialogs().isIdle();

    // Greets the active Profile after a pause: right on the press or on the
    // wheel's first frame, it felt abrupt. Whatever is drawn stays still
    // meanwhile. A menu or dialog that opened during the pause cancels it;
    // at startup the greeting then waits for the next free wheel.
    function greetAfterPause({ atStartup = false } = {}) {
        startupGreetingPending = false;
        greetingDelayTimer = host.setTimeout(safeHandler(SCRIPT_NAME, () => {
            greetingDelayTimer = null;
            if (isWheelFree()) {
                greet(profileStore.getActiveProfile());
                return;
            }
            stopGreeting();
            if (atStartup) startupGreetingPending = true;
        }), GREETING.delayMs);
    }

    // Greets the restored Profile once the wheel is free: no menu, no
    // dialog on screen or waiting, and no carousel.
    function greetAtStartupIfFree() {
        if (!startupGreetingPending || slots || greetingDelayTimer !== null) return;
        if (isWheelFree()) greetAfterPause({ atStartup: true });
    }

    function stopGlide() {
        host.clearInterval(glideTimer);
        glideTimer = null;
        glide = 0;
    }

    // Runs every frame while the Avatars glide; timed on the clock, like the
    // greeting.
    function glideStep() {
        const nowMs = host.now().getTime();
        glide *= Math.exp(-(nowMs - glideLastMs) / GLIDE_TIME_CONSTANT_MS);
        glideLastMs = nowMs;
        // Arrived: placeCarousel() shows the name.
        if (Math.abs(glide) < GLIDE_SNAP) stopGlide();
        placeCarousel();
    }

    // direction: 1 for Next, -1 for Prev. A press during a glide carries on
    // from where the Avatars are.
    function move(direction) {
        navigationSound.play();
        highlighted = (highlighted + direction + slots.length) % slots.length;
        glide += direction;
        if (glideTimer === null) {
            glideLastMs = host.now().getTime();
            glideTimer = host.setInterval(safeHandler(SCRIPT_NAME, glideStep), FRAME_MS);
        }
        placeCarousel();
    }

    // The window watch saw the view's size change while the carousel is
    // open: drawn again in place, the same Profile highlighted. False,
    // nothing placed, while the layers' window keeps its old size.
    function followWindow(previousView, nextView) {
        const previousLayout = layout;
        measure();
        if (sameSize(layout, previousLayout)) return false;
        placeCarousel();
        host.log(`[${SCRIPT_NAME}] The carousel is redrawn for the window's new size: view ${sizeText(previousView)} to ${sizeText(nextView)}, layers ${sizeText(previousLayout)} to ${sizeText(layout)}.`);
        return true;
    }

    // Never measured, measured for other worn frames, or for another window.
    const isLayoutStale = () => !layout || isMeasuredFramed !== isFramed() || !sameSize(readViewSize(host, SCRIPT_NAME), layoutView);

    function open() {
        stopGreeting();
        // The player is already choosing: greeting them afterwards would
        // come out of nowhere.
        startupGreetingPending = false;
        // A native menu left open would stay stuck behind the carousel.
        if (host.getUIMode() === "menu") host.doCommand(host.getBuiltInCommand("MenuReturn"));
        quietWheel.hold(SCRIPT_NAME);
        slots = readSlots();
        const activeName = profileStore.getActiveProfile().name;
        highlighted = Math.max(0, slots.findIndex(slot => slot.name === activeName));
        if (isLayoutStale()) measure();
        // Here rather than on the first move, which it would slow down.
        navigationSound.load();
        backLayer.alpha = 1;
        placeCarousel();
        windowWatch.start(followWindow);
        // Only the startup carousel, whether its turn or a menu opened it.
        if (isStartupPending) playPickerSound();
    }

    // Frees the wheel dialog queue held by the startup carousel. Without
    // the Welcome Screen to follow, the veil goes with it.
    function releaseStartupDialog() {
        isStartupPending = false;
        if (!closeStartupDialog) return;
        const done = closeStartupDialog;
        closeStartupDialog = null;
        if (!isWelcomeScreenOn) startupVeil.hide();
        done();
    }

    // isFollowed: the Welcome Screen comes next and takes the quiet wheel
    // over; otherwise the table is back at once.
    function close({ isFollowed = false } = {}) {
        stopGlide();
        windowWatch.stop();
        slots = null;
        stopGreeting();
        markAheadStale();
        releaseStartupDialog();
        quietWheel.release(SCRIPT_NAME, { atOnce: !isFollowed });
    }

    // Its turn in the wheel dialog module: the wheel is free. A carousel the
    // player opened from a menu meanwhile becomes the startup one. Opened
    // at once: the window watch follows PinballY laying the window out.
    function openAtStartup(closeDialog) {
        closeStartupDialog = closeDialog;
        if (!slots) open();
        startupVeil.hideLoader();
    }

    // While the startup carousel waits its turn: it never shows, and
    // nothing follows it. The active Profile stays.
    function dropStartup() {
        startupVeil.hide();
        releaseStartupDialog();
    }

    // Select on a Profile. Later in the session the Welcome Screen welcomes
    // a new Profile itself, on the switch, and a Profile kept by nothing;
    // the startup carousel hands over to it before the switch, whatever the
    // pick, so it follows once.
    function pick(chosen) {
        if (isWelcomeScreenOn) {
            const isSwitch = chosen.name !== profileStore.getActiveProfile().name;
            const isFollowed = isStartupPending || isSwitch;
            if (isStartupPending) notifyStartupPickerDone();
            close({ isFollowed });
            if (isSwitch) profileStore.switchTo(chosen.name);
            return;
        }
        const atStartup = isStartupPending;
        // The carousel stays drawn, at rest, until the greeting replaces it.
        stopGlide();
        placeCarousel();
        windowWatch.stop();
        slots = null;
        profileStore.switchTo(chosen.name);
        releaseStartupDialog();
        quietWheel.release(SCRIPT_NAME, { atOnce: true });
        greetAfterPause({ atStartup });
    }

    // Name Entry created a Profile: the carousel, still open under it, comes
    // back on it, and no switch happens, so an Admin Profile stays itself to mark it.
    function showCreated(name) {
        slots = readSlots();
        highlighted = Math.max(0, slots.findIndex(slot => slot.name === name));
        placeCarousel();
    }

    // Exit keeps the active Profile; at startup it is welcomed or greeted
    // all the same.
    function exit() {
        const atStartup = isStartupPending;
        if (atStartup && isWelcomeScreenOn) notifyStartupPickerDone();
        close({ isFollowed: atStartup && isWelcomeScreenOn });
        if (atStartup && !isWelcomeScreenOn) greetAfterPause({ atStartup });
    }

    getMainMenu().add({ name: "profilePicker", label: TEXT.menuEntry, position: MAIN_MENU_POSITION.PROFILE_PICKER, action: open });

    // The main menu module only serves the main menu: the exit menu entry
    // has its own command.
    const exitMenuCommand = host.allocateCommand("profilePickerExitMenu");

    // Fires when any menu opens, with a fresh item list each time.
    host.on("menuopen", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id !== "exit") return;
        ev.addMenuItem({ after: host.getBuiltInCommand("Quit") }, { title: TEXT.menuEntry, cmd: exitMenuCommand });
    }));

    // Fires on every command.
    host.on("command", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id === exitMenuCommand) open();
    }));

    // Fires on every mapped button press; drives the carousel while it is open.
    host.on("commandbuttondown", safeHandler(SCRIPT_NAME, ev => {
        // A press already handled may be the one that opened it, from a Drawn Menu.
        if (!slots || ev.defaultPrevented) return;
        // Swallowed first, so a failing switch still never reaches the wheel.
        ev.preventDefault();
        if (ev.command === "Next" || ev.command === "Prev") {
            move(ev.command === "Next" ? 1 : -1);
            return;
        }
        // The button held on Name Entry's OK or Exit must not pick a Profile
        // or close the carousel that just came back.
        if (ev.repeat) return;
        if (ev.command === "Select" || ev.command === "Launch") {
            const chosen = slots[highlighted];
            if (chosen === NEW_PROFILE_SLOT) nameEntry.open(showCreated);
            else pick(chosen);
        } else if (ev.command === "Exit") {
            exit();
        }
    }));

    // Fires on every switch: the names' colours change.
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => {
        drawBadge();
        markAheadStale();
    }));
    // Fires when the active Profile's shown level changes: a Level Toast
    // starting, a Profile Reset, the baseline after a switch.
    shownPlayerLevel.onChange(safeHandler(SCRIPT_NAME, drawBadge));
    // Fires after any saved change of a Profile's data: an Avatar Frame
    // chosen, or taken back by a Profile Reset, is drawn again (ahead for
    // the carousel). Every Play saves too, so only a change of frame redraws.
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, profileName => {
        if (profileName === profileStore.getActiveProfile().name
            && profileRewards.wornImageOf(profileName, BADGE_FRAME_SIDE) !== badgeFramePath) drawBadge();
        if (framePaths.has(profileName)
            && profileRewards.wornImageOf(profileName, FRAMED_AVATAR_SIDE) !== framePaths.get(profileName)) markAheadStale();
    }));

    // The badge and the greeting must never cover a game; a player who
    // started one from the Welcome Screen was greeted by it already.
    // A table launched from a native menu before the startup carousel
    // showed: the player already chose, so it must not show after the game.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        badgeLayer.alpha = 0;
        startupGreetingPending = false;
        stopGreeting();
        if (isStartupPending && !slots) dropStartup();
    }));
    // Fires back on the wheel, after a game, a menu or a dialog.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        badgeLayer.alpha = 1;
        greetAtStartupIfFree();
    }));
    // No "wheelmode" follows the close of a Drawn Menu or a drawn screen.
    getWheelDialogs().onOverlayClosed(greetAtStartupIfFree);

    // Fires when the cabinet sits idle: the player left without picking, so
    // the carousel must not stay drawn over attract mode or keep the buttons.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, () => {
        if (isStartupPending) dropStartup();
        close();
    }));

    // Last, so the Welcome Screen never opens a carousel whose listeners are missing.
    registerChangePlayer(open);
    drawBadge();
    // Through the wheel dialog module, so toasts and prompts wait for it as
    // for the Welcome Screen; later openings are the player's own.
    if (isStartupPending) {
        startupVeil.show();
        getWheelDialogs().submit({ priority: DIALOG_PRIORITY.STARTUP_PROMPT, open: openAtStartup, isStale: () => !isStartupPending });
    }
    // One tick after the inits, so the dialogs every Add-on submits at
    // startup are already waiting, whatever the order in main.js.
    host.setTimeout(safeHandler(SCRIPT_NAME, greetAtStartupIfFree), 0);
}
