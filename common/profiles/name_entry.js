// ============================================================
// Name Entry: the drawn screen, over the Profile picker, where a new
// Profile's name is put together with the flippers on a ring of characters.
// OK creates the Profile and hands its name back; Exit and attract mode
// create nothing. Opens directly: the player asked for it. Writes one folder.
// - A folder that cannot be created keeps the screen open with a message, logged, with no Error Toast.
// - Moving along the ring only moves layers: each draw blocks PinballY 20 to 45 ms on the cabinet.
// - Buttons and attract mode go through the Drawn Screen controls, set up before the Profile picker's listener.
// - Opens through the shared screen opening (docs/adr/0014).
// - Never handed to the wheel dialogs: its close must not let a Dialog show over the carousel.
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

const SCRIPT_NAME = "NameEntry";

const MAX_NAME_LENGTH = 12;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER_A = LETTERS.length;
const HYPHEN = "-";
// A left arrow, by its code so the file stays plain ASCII, without a BOM.
const ERASE_ARROW = String.fromCharCode(0x2190);
// The strip's characters fade away from the current one, by this much per place.
const FADE_PER_PLACE = 0.2;

// drawingAhead: the shared drawing ahead (common/core/drawing_ahead.js);
// drawnScreenControls: the shared Drawn Screen controls (common/core/drawn_screen_controls.js).
export function createNameEntry(host, { profileStore, drawingAhead, drawnScreenControls }) {
    const { profiles: { nameEntry: TEXT, guestName } } = lang;
    // A character, or what erasing and OK show, in the ring's order.
    const RING = [...LETTERS, ...LETTERS.toLowerCase(), HYPHEN, ERASE_ARROW, TEXT.ok];
    const ERASE = RING.length - 2;
    const OK = RING.length - 1;
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    const opening = createScreenOpening(host, SCRIPT_NAME, { zIndex: Z_INDEX.backdrop - 2, drawingAhead });
    const placed = createPlacedLayers(host, { referenceHeight: REFERENCE_HEIGHT });
    const windowRedraw = createWindowRedraw(host, SCRIPT_NAME, {
        placed, zIndex: Z_INDEX.backdrop, referenceHeight: REFERENCE_HEIGHT,
        layout: referenceWidth => layoutNameEntry(referenceWidth, TEXT.lines.length + (shown.notice === null ? 0 : 1)),
    });
    // Here, before the Profile picker adds its own button listener.
    const controls = drawnScreenControls.register(SCRIPT_NAME);
    // The open screen, null when closed: the name so far and why it is
    // refused, the Profiles listed at the opening, the first Profile's notice (null
    // once the Household has a Profile), whether its folder just failed, the current
    // character's index, what OK hands the name to, its place among the Drawn
    // Screen controls, its layout and its layers (null marker while getting ready).
    let shown = null;

    const isOkGreyed = () => shown.refusal !== null;
    const refusalOf = name => nameRefusal(name, { listedNames: shown.listedNames, guestNameShown: guestName });

    // The failed folder's message takes the reason's place; an empty name has no reason to give.
    function reasonText() {
        if (shown.hasFolderFailed) return TEXT.folderFailed;
        return shown.refusal === null || shown.refusal === NAME_REFUSAL.EMPTY ? "" : TEXT.refusals[shown.refusal];
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
    const drawCharacterOn = (index, rect) => dc => drawCharacter(host, dc, RING[index], index === OK && isOkGreyed(), rect.w, rect.h);

    function useBackdrop({ layer, referenceWidth, geometry }) {
        Object.assign(shown, { referenceWidth, geometry, backdrop: layer });
    }

    // Each piece as one step, for the opening to run in slices; the backdrop
    // comes first, as the pieces' places depend on what it measures.
    function pieceSteps() {
        const footerGroups = buttonHintGroupsOf({ flippers: FLIPPER_HINT.BROWSE, select: true, exitLook: EXIT_BUTTON_LOOK.BACK });
        return [
            () => {
                const { title } = shown.geometry;
                drawPiece(Z_INDEX.texts, title, dc => drawTitle(host, dc, TEXT.title, title.w, title.h), shown.fixedLayers);
            },
            () => {
                const { lines } = shown.geometry;
                drawPiece(Z_INDEX.texts, lines, dc => drawLines(host, dc, TEXT.lines, shown.notice, lines.w), shown.fixedLayers);
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
            ...RING.map((character, index) => () => {
                const rect = cellRectOf(shown.geometry, 0);
                drawPiece(Z_INDEX.ring, rect, drawCharacterOn(index, rect), shown.ringLayers);
            }),
        ];
    }

    // The strip around the current character: moves and fades layers only.
    // The others wait reduced to a point.
    function placeRing() {
        const half = (shown.geometry.cellsShown - 1) / 2;
        const shownOffsets = new Map();
        for (let offset = -half; offset <= half; offset++) shownOffsets.set((shown.cursor + offset + RING.length) % RING.length, offset);
        shown.ringLayers.forEach((layer, index) => {
            if (!shownOffsets.has(index)) {
                if (placed.isShown(layer)) placed.hide(layer);
                return;
            }
            const offset = shownOffsets.get(index);
            placed.place(layer, cellRectOf(shown.geometry, offset));
            placed.show(layer);
            layer.alpha = shown.opacity * (1 - FADE_PER_PLACE * Math.abs(offset));
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

    // Exit, a failed draw, and OK once the Profile is created.
    const leave = () => {
        if (shown) shown.controlled.close();
    };

    // onCreated(name): called once the Profile is created and the screen closed.
    function open(onCreated) {
        if (shown) return;
        // Here rather than on the first move, which it would slow down.
        navigationSound.load();
        // Read before the screen counts as open, so a failed read leaves it closed.
        const listedNames = profileStore.listProfileNames();
        const notice = profileStore.isHouseholdEmpty() ? TEXT.firstProfileLine : null;
        shown = {
            name: "", refusal: NAME_REFUSAL.EMPTY, listedNames, notice, hasFolderFailed: false, cursor: 0, onCreated, opacity: 0,
            controlled: controls.open({ onMove: move, onChoose: choose, onExit: leave, close: remove }),
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

    function setName(name) {
        shown.name = name;
        redraw(shown.nameLayer, shown.geometry.name, drawNameOn(shown.geometry.name));
        checkName();
    }

    // Checks the name again, drawing the reason and OK only if they changed.
    function checkName() {
        const wasOkGreyed = isOkGreyed();
        const previousReason = reasonText();
        shown.refusal = refusalOf(shown.name);
        shown.hasFolderFailed = false;
        if (reasonText() !== previousReason) redrawReason();
        if (isOkGreyed() === wasOkGreyed) return;
        const rect = cellRectOf(shown.geometry, 0);
        redraw(shown.ringLayers[OK], rect, drawCharacterOn(OK, rect));
    }

    function create() {
        const { name, onCreated } = shown;
        // A folder added in Windows since the opening is a refused name, not a failure.
        shown.listedNames = profileStore.listProfileNames();
        checkName();
        if (isOkGreyed()) return;
        let createdName;
        try {
            createdName = profileStore.createProfile(name, guestName);
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
    // chosen, for double letters, except after a first capital.
    function choose() {
        const { cursor, name } = shown;
        if (cursor === OK) {
            if (!isOkGreyed()) create();
        } else if (cursor === ERASE) {
            if (name !== "") setName(name.slice(0, -1));
        } else if (name.length < MAX_NAME_LENGTH && !isMisplacedHyphen(RING[cursor], name)) {
            setName(name + RING[cursor]);
            if (name === "") {
                shown.cursor = LOWER_A;
                placeRing();
            }
        }
    }

    function move(direction, isRepeat) {
        navigationSound.play(direction, isRepeat);
        shown.cursor = (shown.cursor + direction + RING.length) % RING.length;
        placeRing();
    }

    return { open };
}
