// ============================================================
// Avatar Choice: the drawn screen, over the Profile picker, where a Profile
// Name Entry just created takes one of the pack's portraits as its Avatar.
// Select or Launch copies it as the Profile's avatar.png; Exit keeps the
// Default Avatar. Both hand back to the picker; attract mode copies nothing.
// - Moving only moves the Selection Marker: the portraits are drawn once, at opening.
// - Swallows every button through "commandbuttondown" while open; a press already handled is not its own.
// - Registered before the Profile picker's listener, which then sees each press as handled.
// - Opens through the shared screen opening (docs/adr/0014).
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler, logHandlerError } from "../core/safe_handler.js";
import { createNavigationSound } from "../core/navigation_sound.js";
import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { createSelectionMarker } from "../drawing/selection_marker.js";
import { createScreenOpening } from "../drawing/screen_opening.js";
import { drawBackdrop, drawExitButton, exitTooltipRectOf, drawExitTooltip, drawButtonHintsBand, EXIT_BUTTON_LOOK } from "../drawing/steamball_drawing.js";
import { buttonHintGroupsOf, exitButtonWordOf, FLIPPER_HINT } from "../drawing/button_hints.js";
import { EXIT_BUTTON, stepThroughExitButton } from "../drawing/exit_button_loop.js";
import {
    AVATAR_CHOICE_Z_INDEX as Z_INDEX, REFERENCE_HEIGHT, layoutAvatarChoice, portraitRectOf, drawTitle, drawName, drawHint, drawPortrait,
} from "./avatar_choice_painter.js";

const SCRIPT_NAME = "AvatarChoice";

const AVATAR_CHOICE_FOLDER ="assets\\images\\avatar_choice";
// Any other file there is left out.
const PORTRAIT_FILE = /^avatar_choice_(\d+)\.png$/i;

// The pack's portraits, in their numbers' order.
function readPortraits(host) {
    const folder = `${host.getProjectFolder()}\\${AVATAR_CHOICE_FOLDER}`;
    const numberOf = name => Number(PORTRAIT_FILE.exec(name)[1]);
    return host.files.listFiles(folder)
        .filter(name => PORTRAIT_FILE.test(name))
        .sort((a, b) => numberOf(a) - numberOf(b))
        .map(name => `${folder}\\${name}`);
}

// drawingAhead: the shared drawing ahead (common/core/drawing_ahead.js).
export function createAvatarChoice(host, { profileStore, drawingAhead }) {
    const { profiles: { avatarChoice: TEXT } } = lang;
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    const opening = createScreenOpening(host, SCRIPT_NAME, { zIndex: Z_INDEX.backdrop - 2, drawingAhead });
    // The open screen, null when closed: the Profile's name, the portraits'
    // paths, the selected portrait's index (or EXIT_BUTTON), what closing
    // hands back to, the layout and its layers (null marker while getting ready).
    let shown = null;

    // Draws the backdrop, which measures the window the layout depends on.
    // A draw that throws leaves no window-sized layer behind, which PinballY
    // would fill on every frame.
    function drawBackdropLayer() {
        const layer = host.createDrawingLayer(Z_INDEX.backdrop);
        layer.alpha = 0;
        try {
            layer.draw(dc => {
                const size = dc.getSize();
                shown.referenceWidth = REFERENCE_HEIGHT * size.width / size.height;
                shown.geometry = layoutAvatarChoice(shown.referenceWidth);
                drawBackdrop(dc, size, REFERENCE_HEIGHT, shown.geometry.panel);
            });
        } catch (error) {
            host.removeDrawingLayer(layer);
            throw error;
        }
        shown.backdrop = layer;
    }

    function place(layer, rect) {
        layer.setScale({ ySpan: rect.h / REFERENCE_HEIGHT });
        layer.setPos((rect.x + rect.w / 2) / shown.referenceWidth - 0.5, 0.5 - (rect.y + rect.h / 2) / REFERENCE_HEIGHT);
    }

    // A hidden layer placed on rect and drawn in its own coordinates, kept
    // before drawing, so a draw that throws leaves nothing behind once closed.
    function drawPiece(zIndex, rect, draw) {
        const layer = host.createDrawingLayer(zIndex);
        shown.layers.push(layer);
        layer.alpha = 0;
        layer.clear(STEAMBALL_COLORS.transparent);
        place(layer, rect);
        layer.draw(draw, rect.w, rect.h);
        return layer;
    }

    // Each piece as one step, for the opening to run in slices; the backdrop
    // comes first, as the pieces' places depend on what it measures.
    function steps() {
        const exitWord = exitButtonWordOf(EXIT_BUTTON_LOOK.BACK);
        const hints = buttonHintGroupsOf({ flippers: FLIPPER_HINT.BROWSE, select: true, exitLook: EXIT_BUTTON_LOOK.BACK });
        const geometry = () => shown.geometry;
        return [
            drawBackdropLayer,
            () => drawPiece(Z_INDEX.texts, geometry().title, dc => drawTitle(host, dc, TEXT.title, geometry().title.w, geometry().title.h)),
            () => drawPiece(Z_INDEX.texts, geometry().name, dc => drawName(host, dc, shown.profileName, geometry().name.w, geometry().name.h)),
            () => drawPiece(Z_INDEX.texts, geometry().hint, dc => drawHint(host, dc, TEXT.line, geometry().hint.w, geometry().hint.h)),
            () => drawPiece(Z_INDEX.exitButton, geometry().exitButton, dc => drawExitButton(dc, EXIT_BUTTON_LOOK.BACK)),
            () => {
                shown.tooltip = drawPiece(Z_INDEX.tooltip, exitTooltipRectOf(geometry().exitButton), dc => drawExitTooltip(host, dc, exitWord));
            },
            () => {
                const rect = geometry().buttonHints;
                drawPiece(Z_INDEX.buttonHints, rect, dc => drawButtonHintsBand(host, dc, hints, { width: rect.w, height: rect.h }));
            },
            ...shown.portraits.map((path, index) => () => {
                const rect = portraitRectOf(geometry(), index);
                drawPiece(Z_INDEX.portraits, rect, dc => drawPortrait(dc, path, rect.w));
            }),
        ];
    }

    const selectedRect = () => (shown.selected === EXIT_BUTTON ? shown.geometry.exitButton : portraitRectOf(shown.geometry, shown.selected));

    // Each frame of the fade in, and each move. The Exit Button's tooltip
    // shows only while it is selected.
    function setOpacity(opacity) {
        shown.opacity = opacity;
        shown.backdrop.alpha = opacity;
        for (const layer of shown.layers) layer.alpha = opacity;
        if (shown.selected !== EXIT_BUTTON) shown.tooltip.alpha = 0;
        shown.marker.setOpacity(opacity);
    }

    // Closes the screen or gives up the one getting ready; nothing handed back.
    function close() {
        if (!shown) return;
        const { marker, backdrop, layers } = shown;
        shown = null;
        opening.remove();
        if (marker) marker.remove();
        if (backdrop) host.removeDrawingLayer(backdrop);
        for (const layer of layers) host.removeDrawingLayer(layer);
    }

    function leave() {
        const { onClosed } = shown;
        close();
        onClosed();
    }

    // profileName: the Profile just created; onClosed(): called once the
    // screen is closed by a choice, Exit or a failed opening, never by attract mode.
    function open(profileName, onClosed) {
        if (shown) return;
        // Here rather than on the first move, which it would slow down.
        navigationSound.load();
        opening.begin();
        const portraits = opening.read(() => readPortraits(host));
        shown = {
            profileName, portraits, onClosed, selected: 0, isPreparing: true, opacity: 0,
            referenceWidth: 0, geometry: null, backdrop: null, layers: [], tooltip: null, marker: null,
        };
        const pending = steps();
        opening.runVeiled(() => {
            opening.draw(pending.shift());
            return pending.length > 0;
        }, {
            onDone: () => {
                shown.isPreparing = false;
                shown.marker = createSelectionMarker(host, { zIndex: Z_INDEX.marker, referenceWidth: shown.referenceWidth, referenceHeight: REFERENCE_HEIGHT });
                shown.marker.moveTo(selectedRect());
                setOpacity(0);
                opening.logOpened({ profileName });
                opening.fadeIn(setOpacity);
            },
            // Logged by the drawing ahead: the picker comes back on the Profile.
            onFailed: leave,
        });
    }

    // direction: 1 for Next, -1 for Prev, through the Exit Button then each portrait.
    function move(direction) {
        navigationSound.play();
        shown.selected = stepThroughExitButton(shown.selected, direction, shown.portraits.length);
        shown.marker.moveTo(selectedRect());
        setOpacity(shown.opacity);
    }

    // A portrait is taken at once; a copy that fails keeps the Default Avatar.
    function choose() {
        if (shown.selected === EXIT_BUTTON) return leave();
        try {
            profileStore.giveAvatar(shown.profileName, shown.portraits[shown.selected]);
        } catch (error) {
            // It answers what the player just chose, on the screen: no Error Toast.
            logHandlerError(SCRIPT_NAME, error);
        }
        return leave();
    }

    // Fires on every mapped button press; drives the screen while it is open.
    host.on("commandbuttondown", safeHandler(SCRIPT_NAME, ev => {
        // Already handled: Name Entry's OK opened the screen within the same press.
        if (!shown || ev.defaultPrevented) return;
        // Swallowed first, so a failing copy still never reaches the wheel.
        ev.preventDefault();
        if (ev.command === "Next" || ev.command === "Prev") {
            if (!shown.isPreparing) move(ev.command === "Next" ? 1 : -1);
            return;
        }
        // A held button counts once.
        if (ev.repeat) return;
        if (ev.command === "Exit") leave();
        // Launch is the plunger, which selects in PinballY's own menus too.
        else if ((ev.command === "Select" || ev.command === "Launch") && !shown.isPreparing) choose();
    }));

    // Fires when the cabinet sits idle: the screen must not stay over attract
    // mode nor keep the buttons. Nothing is copied; the picker closes itself.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, close));

    return { open };
}
