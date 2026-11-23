// ============================================================
// Name Entry: the drawn screen where a word is put together with the
// flippers on a ring of characters. Over the Profile picker, a new Profile's
// name: OK creates the Profile (one folder written) and hands its name back.
// From Manage profiles, a Profile's Initials: OK hands them back, saving nothing;
// once three letters are in, the cursor goes to OK and only erasing or OK can be chosen.
// - Exit and attract mode create nothing; a failed folder keeps the screen open with a message, logged, no Error Toast.
// - Moving along the ring only moves layers: each draw blocks PinballY 20 to 45 ms on the cabinet.
// - Buttons and attract mode go through the Drawn Screen controls, set up before the Profile picker's listener.
// - Opens through the shared screen opening (docs/adr/0014), never through the wheel dialogs.
// ============================================================

import lang from "../core/i18n.js";
import { logHandlerError } from "../core/safe_handler.js";
import { createNavigationSound } from "../core/navigation_sound.js";
import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { createSelectionMarker } from "../drawing/selection_marker.js";
import { createScreenOpening } from "../drawing/screen_opening.js";
import { createWindowRedraw } from "../drawing/window_redraw.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";
import { drawButtonHintsBand, EXIT_BUTTON_LOOK } from "../drawing/steamball_drawing.js";
import { buttonHintGroupsOf, FLIPPER_HINT } from "../drawing/button_hints.js";
import {
    NAME_ENTRY_Z_INDEX as Z_INDEX, REFERENCE_HEIGHT, layoutNameEntry, cellRectOf, drawTitle, drawLines, drawName, drawReason, drawCharacter,
} from "./name_entry_painter.js";
import { NAME_REFUSAL, nameRefusal } from "./profile_name_rules.js";
import { INITIALS_LENGTH, INITIALS_REFUSAL, initialsRefusal } from "./initials_rules.js";

const SCRIPT_NAME = "NameEntry";

const MAX_NAME_LENGTH = 12;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER_A = LETTERS.length;
const HYPHEN = "-";
// A left arrow, by its code so the file stays plain ASCII, without a BOM.
const ERASE_ARROW = String.fromCharCode(0x2190);
// The strip's characters fade away from the current one, by this much per place.
const FADE_PER_PLACE = 0.2;
// A letter that cannot be chosen is greyed by its layer's alpha, not drawn
// anew: redrawing the 26 letters would block PinballY for most of a second.
const BLOCKED_ALPHA = 0.3;

// drawingAhead: the shared drawing ahead (common/core/drawing_ahead.js);
// drawnScreenControls: the shared Drawn Screen controls (common/core/drawn_screen_controls.js).
export function createNameEntry(host, { profileStore, drawingAhead, drawnScreenControls }) {
    const { profiles: { nameEntry: TEXT, guestName } } = lang;
    // A character, or what erasing and OK show, in the ring's order: erasing and OK always last.
    const NAME_RING = [...LETTERS, ...LETTERS.toLowerCase(), HYPHEN, ERASE_ARROW, TEXT.ok];
    const INITIALS_RING = [...LETTERS, ERASE_ARROW, TEXT.ok];
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    const opening = createScreenOpening(host, SCRIPT_NAME, { zIndex: Z_INDEX.backdrop - 2, drawingAhead });
    const placed = createPlacedLayers(host, { referenceHeight: REFERENCE_HEIGHT });
    const windowRedraw = createWindowRedraw(host, SCRIPT_NAME, {
        placed, zIndex: Z_INDEX.backdrop, referenceHeight: REFERENCE_HEIGHT,
        layout: referenceWidth => layoutNameEntry(referenceWidth, shown.mode.lines.length + (shown.mode.notice === null ? 0 : 1)),
    });
    // Here, before the Profile picker adds its own button listener.
    const controls = drawnScreenControls.register(SCRIPT_NAME);
    // The open screen, null when closed: its mode (what it puts together, see
    // nameMode and initialsMode), the word so far and why it is refused,
    // whether the Profile's folder just failed, the current character's index,
    // its place among the Drawn Screen controls, its layout and its layers
    // (null marker while getting ready).
    let shown = null;

    const ring = () => shown.mode.ring;
    const eraseIndex = () => ring().length - 2;
    const okIndex = () => ring().length - 1;
    const isOkGreyed = () => shown.refusal !== null;
    // Full Initials leave only erasing and OK to choose: the letters are greyed and skipped.
    const isFull = () => shown.mode.okOnceFull && shown.name.length >= shown.mode.maxLength;
    const isLetterBlocked = index => index < eraseIndex() && isFull();

    // The failed folder's message takes the reason's place.
    function reasonText() {
        if (shown.hasFolderFailed) return TEXT.folderFailed;
        return shown.refusal === null ? "" : shown.mode.reasonOf(shown.refusal, shown.name);
    }

    // A new Profile's name. onCreated(name): once the Profile is created and the screen closed.
    function nameMode(onCreated) {
        // Read before the screen counts as open, so a failed read leaves it closed.
        let listedNames = profileStore.listProfileNames();
        return {
            ring: NAME_RING, maxLength: MAX_NAME_LENGTH, title: TEXT.title, lines: TEXT.lines, word: "",
            // Only while the Household is empty.
            notice: profileStore.isHouseholdEmpty() ? TEXT.firstProfileLine : null,
            // After a first capital, the cursor goes to the lower case.
            lowerAfterFirst: true, okOnceFull: false,
            refusalOf: name => nameRefusal(name, { listedNames, guestNameShown: guestName }),
            // An empty name has no reason to give.
            reasonOf: refusal => (refusal === NAME_REFUSAL.EMPTY ? "" : TEXT.refusals[refusal]),
            ok() {
                // A folder added in Windows since the opening is a refused name, not a failure.
                listedNames = profileStore.listProfileNames();
                checkName();
                if (!isOkGreyed()) create(onCreated);
            },
            onExit: () => {},
        };
    }

    // A Profile's Initials, the current ones pre-filled. holderOf(initials):
    // the other Profile's name holding them, null when none; onDone(initials):
    // once closed by OK, "" to clear them; onExit(): once closed by Exit.
    function initialsMode({ profileName, current, holderOf, onDone, onExit }) {
        return {
            ring: INITIALS_RING, maxLength: INITIALS_LENGTH, title: TEXT.initials.title(profileName), lines: TEXT.initials.lines, word: current || "",
            // Once three letters are in, the cursor goes to OK.
            notice: null, lowerAfterFirst: false, okOnceFull: true,
            refusalOf: initials => initialsRefusal(initials, holderOf),
            reasonOf: (refusal, initials) => (refusal === INITIALS_REFUSAL.TAKEN
                ? TEXT.initials.refusals.taken(holderOf(initials)) : TEXT.initials.refusals.threeLetters),
            ok() {
                const initials = shown.name;
                leave();
                onDone(initials);
            },
            onExit,
        };
    }

    // A hidden layer placed on rect and drawn in its own coordinates, kept
    // in into before drawing, so a draw that throws leaves nothing behind once closed.
    function drawPiece(zIndex, rect, draw, into) {
        const layer = placed.create(zIndex);
        into.push(layer);
        layer.clear(STEAMBALL_COLORS.transparent);
        placed.place(layer, rect);
        layer.draw(draw, rect.w, rect.h);
        return layer;
    }

    function redraw(layer, { w, h }, draw) {
        layer.clear(STEAMBALL_COLORS.transparent);
        layer.draw(draw, w, h);
    }

    const drawNameOn = rect => dc => drawName(host, dc, shown.name, rect.w, rect.h);
    const drawReasonOn = rect => dc => drawReason(host, dc, reasonText(), rect.w, rect.h);
    const drawCharacterOn = (index, rect) => dc => drawCharacter(host, dc, ring()[index], index === okIndex() && isOkGreyed(), rect.w, rect.h);

    function useBackdrop({ layer, referenceWidth, geometry }) {
        Object.assign(shown, { referenceWidth, geometry, backdrop: layer });
    }

    // Each piece as one step, for the opening to run in slices; the backdrop
    // comes first, as the pieces' places depend on what it measures.
    function pieceSteps() {
        const footerGroups = buttonHintGroupsOf({ flippers: FLIPPER_HINT.BROWSE, select: true, exitLook: EXIT_BUTTON_LOOK.BACK });
        const { mode } = shown;
        return [
            () => {
                const { title } = shown.geometry;
                drawPiece(Z_INDEX.texts, title, dc => drawTitle(host, dc, mode.title, title.w, title.h), shown.fixedLayers);
            },
            () => {
                const { lines } = shown.geometry;
                drawPiece(Z_INDEX.texts, lines, dc => drawLines(host, dc, mode.lines, mode.notice, lines.w), shown.fixedLayers);
            },
            () => {
                const { name } = shown.geometry;
                shown.nameLayer = drawPiece(Z_INDEX.name, name, drawNameOn(name), shown.fixedLayers);
            },
            () => {
                const { reason } = shown.geometry;
                shown.reasonLayer = drawPiece(Z_INDEX.reason, reason, drawReasonOn(reason), shown.fixedLayers);
            },
            () => {
                const { buttonHints } = shown.geometry;
                drawPiece(Z_INDEX.buttonHints, buttonHints, dc => drawButtonHintsBand(host, dc, footerGroups, { width: buttonHints.w, height: buttonHints.h }), shown.fixedLayers);
            },
            ...mode.ring.map((character, index) => () => {
                const rect = cellRectOf(shown.geometry, 0);
                drawPiece(Z_INDEX.ring, rect, drawCharacterOn(index, rect), shown.ringLayers);
            }),
        ];
    }

    // The strip around the current character: moves and fades layers only.
    // The others wait reduced to a point.
    function placeRing() {
        const half = (shown.geometry.cellsShown - 1) / 2;
        const size = ring().length;
        const shownOffsets = new Map();
        for (let offset = -half; offset <= half; offset++) shownOffsets.set((shown.cursor + offset + size) % size, offset);
        shown.ringLayers.forEach((layer, index) => {
            if (!shownOffsets.has(index)) {
                if (placed.isShown(layer)) placed.hide(layer);
                return;
            }
            const offset = shownOffsets.get(index);
            placed.place(layer, cellRectOf(shown.geometry, offset));
            placed.show(layer);
            layer.alpha = shown.opacity * (1 - FADE_PER_PLACE * Math.abs(offset)) * (isLetterBlocked(index) ? BLOCKED_ALPHA : 1);
        });
    }

    function setOpacity(opacity) {
        shown.opacity = opacity;
        for (const layer of [shown.backdrop, ...shown.fixedLayers]) {
            placed.show(layer);
            layer.alpha = opacity;
        }
        placeRing();
        shown.marker.setOpacity(opacity);
    }

    // The marker stays on the strip's middle, where the current character
    // always is, so moving along the ring never draws it anew.
    function placeMarker() {
        shown.marker = createSelectionMarker(host, { zIndex: Z_INDEX.marker, referenceWidth: shown.referenceWidth, referenceHeight: REFERENCE_HEIGHT });
        shown.marker.moveTo(cellRectOf(shown.geometry, 0));
    }

    function removeLayers() {
        if (shown.marker) shown.marker.remove();
        shown.marker = null;
        if (shown.backdrop) placed.remove(shown.backdrop);
        for (const layer of [...shown.fixedLayers, ...shown.ringLayers]) placed.remove(layer);
        shown.fixedLayers = [];
        shown.ringLayers = [];
    }

    // Redrawn for a new window size: the name and the current character stay
    // in shown, the fade goes on. A redraw that fails gives the screen up.
    const followedScreen = {
        keep: () => () => {
            placeMarker();
            setOpacity(shown.opacity);
        },
        removeLayers, useBackdrop, pieceSteps, onFailed: () => leave(),
    };

    // Run by the Drawn Screen controls on every close, attract mode included.
    function remove() {
        windowRedraw.stop();
        opening.remove();
        removeLayers();
        shown = null;
    }

    // Exit, a failed draw, and OK once done.
    const leave = () => {
        if (shown) shown.controlled.close();
    };

    // The Exit button only: the mode's caller hears of it once closed.
    function exit() {
        const { mode } = shown;
        leave();
        mode.onExit();
    }

    function openIn(mode) {
        // Here rather than on the first move, which it would slow down.
        navigationSound.load();
        shown = {
            mode, name: mode.word, refusal: mode.refusalOf(mode.word), hasFolderFailed: false, opacity: 0,
            // Full Initials pre-filled open on OK.
            cursor: mode.okOnceFull && mode.word.length >= mode.maxLength ? mode.ring.length - 1 : 0,
            controlled: controls.open({ onMove: move, onChoose: choose, onExit: exit, close: remove }),
            referenceWidth: 0, geometry: null, backdrop: null, fixedLayers: [], ringLayers: [], nameLayer: null, reasonLayer: null, marker: null,
        };
        opening.begin();
        const steps = [() => useBackdrop(windowRedraw.drawOpeningBackdrop()), ...pieceSteps()];
        opening.runVeiled(() => {
            opening.draw(steps.shift());
            return steps.length > 0;
        }, {
            onDone: () => {
                shown.controlled.ready();
                placeMarker();
                setOpacity(0);
                opening.logOpened();
                opening.fadeIn(setOpacity);
                windowRedraw.start(followedScreen);
            },
            // Logged by the drawing ahead: given up rather than left veiled.
            onFailed: leave,
        });
    }

    const redrawReason = () => redraw(shown.reasonLayer, shown.geometry.reason, drawReasonOn(shown.geometry.reason));

    // Full Initials put the cursor on OK.
    function setName(name) {
        shown.name = name;
        redraw(shown.nameLayer, shown.geometry.name, drawNameOn(shown.geometry.name));
        checkName();
        if (isFull()) shown.cursor = okIndex();
        placeRing();
    }

    // Checks the name again, drawing the reason and OK only if they changed.
    function checkName() {
        const wasOkGreyed = isOkGreyed();
        const previousReason = reasonText();
        shown.refusal = shown.mode.refusalOf(shown.name);
        shown.hasFolderFailed = false;
        if (reasonText() !== previousReason) redrawReason();
        if (isOkGreyed() === wasOkGreyed) return;
        const rect = cellRectOf(shown.geometry, 0);
        redraw(shown.ringLayers[okIndex()], rect, drawCharacterOn(okIndex(), rect));
    }

    function create(onCreated) {
        let createdName;
        try {
            createdName = profileStore.createProfile(shown.name, guestName);
        } catch (error) {
            // It answers what the player just chose, on the screen: no Error Toast.
            logHandlerError(SCRIPT_NAME, error);
            shown.hasFolderFailed = true;
            redrawReason();
            return;
        }
        leave();
        onCreated(createdName);
    }

    const isMisplacedHyphen = (character, name) => character === HYPHEN && (name === "" || name.endsWith(HYPHEN));

    // Only what changed is drawn again. The cursor stays on the character
    // chosen, for double letters, except after a name's first capital.
    function choose() {
        const { cursor, name, mode } = shown;
        if (cursor === okIndex()) {
            if (!isOkGreyed()) mode.ok();
        } else if (cursor === eraseIndex()) {
            if (name !== "") setName(name.slice(0, -1));
        } else if (name.length < mode.maxLength && !isMisplacedHyphen(ring()[cursor], name)) {
            if (name === "" && mode.lowerAfterFirst) shown.cursor = LOWER_A;
            setName(name + ring()[cursor]);
        }
    }

    function move(direction, isRepeat) {
        navigationSound.play(direction, isRepeat);
        const size = ring().length;
        do {
            shown.cursor = (shown.cursor + direction + size) % size;
        } while (isLetterBlocked(shown.cursor));
        placeRing();
    }

    return {
        // onCreated(name): called once the Profile is created and the screen closed.
        // Before the mode, which reads the Profiles: nothing while open.
        open: onCreated => {
            if (!shown) openIn(nameMode(onCreated));
        },
        // { profileName, current, holderOf, onDone, onExit }: see initialsMode.
        openInitials: options => {
            if (!shown) openIn(initialsMode(options));
        },
    };
}
