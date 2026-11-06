// ============================================================
// Avatar Choice: the drawn screen, over the Profile picker, where a Profile
// Name Entry just created takes one of the pack's readable portraits, copied
// as its avatar.png by Select or Launch; Exit asks, on a panel, before keeping
// the Default Avatar. Both hand back to the picker, as does having no portrait;
// attract mode closes everything, copying nothing. Redrawn when the window resizes.
// - Exit while still opening leaves at once, unasked: no choice can be lost yet.
// - Moving only moves the Selection Marker: the portraits are drawn once, at opening.
// - Swallows every button through "commandbuttondown" while open; a press already handled is not its own.
// - Registered before the Profile picker's listener, which then sees each press as handled.
// - Opens through the shared screen opening (docs/adr/0014).
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler, logHandlerError } from "../core/safe_handler.js";
import { logError } from "../core/error_log.js";
import { createNavigationSound } from "../core/navigation_sound.js";
import { createWindowWatch, readViewSize, sameSize, sizeText } from "../core/window_watch.js";
import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { createSelectionMarker } from "../drawing/selection_marker.js";
import { createScreenOpening } from "../drawing/screen_opening.js";
import { drawBackdrop, drawExitButton, exitTooltipRectOf, drawExitTooltip, drawButtonHintsBand, EXIT_BUTTON_LOOK } from "../drawing/steamball_drawing.js";
import { buttonHintGroupsOf, exitButtonWordOf, FLIPPER_HINT } from "../drawing/button_hints.js";
import { EXIT_BUTTON, stepThroughExitButton } from "../drawing/exit_button_loop.js";
import {
    AVATAR_CHOICE_Z_INDEX as Z_INDEX, REFERENCE_HEIGHT, layoutAvatarChoice, portraitRectOf, drawTitle, drawName, drawHint, drawPortrait,
    layoutConfirmation, drawConfirmationPanel, drawConfirmationChoice,
} from "./avatar_choice_painter.js";

const SCRIPT_NAME = "AvatarChoice";

const AVATAR_CHOICE_FOLDER ="assets\\images\\avatar_choice";
// The Exit confirmation's choices, top to bottom: indexes into its layout's choices.
const CHOICE = Object.freeze({ CHOOSE_AVATAR: 0, KEEP_DEFAULT: 1 });
// Any other file there is left out.
const PORTRAIT_FILE = /^avatar_choice_(\d+)\.png$/i;

// The paths of the pack's readable portraits, in their numbers' order;
// logs each unreadable one, left out.
function readPortraits(host, folder) {
    const numberOf = name => Number(PORTRAIT_FILE.exec(name)[1]);
    const portraits = [];
    const numbered = host.files.listFiles(folder)
        .filter(name => PORTRAIT_FILE.test(name))
        .sort((a, b) => numberOf(a) - numberOf(b))
        .map(name => `${folder}\\${name}`);
    for (const path of numbered) {
        if (host.files.isImageReadable(path)) portraits.push(path);
        else logError(SCRIPT_NAME, `ERROR ${path} is unreadable; Avatar Choice shows without it.`, host);
    }
    return portraits;
}

// drawingAhead: the shared drawing ahead (common/core/drawing_ahead.js).
export function createAvatarChoice(host, { profileStore, drawingAhead }) {
    const { profiles: { avatarChoice: TEXT } } = lang;
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    const windowWatch = createWindowWatch(host, SCRIPT_NAME);
    const opening = createScreenOpening(host, SCRIPT_NAME, { zIndex: Z_INDEX.backdrop - 2, drawingAhead });
    // The open screen, null when closed: the Profile's name, the portraits'
    // paths, the selected portrait's index (or EXIT_BUTTON), what closing
    // hands back to, the window it is laid out for and its layers (null
    // marker while getting ready), and the Exit confirmation while it shows.
    let shown = null;

    // Draws the backdrop, which measures the window the layout depends on.
    // A draw that throws leaves no window-sized layer behind, which PinballY
    // would fill on every frame.
    function drawBackdropLayer() {
        const view = readViewSize(host, SCRIPT_NAME);
        const layer = host.createDrawingLayer(Z_INDEX.backdrop);
        layer.alpha = 0;
        let measured = null;
        try {
            layer.draw(dc => {
                const size = dc.getSize();
                const referenceWidth = REFERENCE_HEIGHT * size.width / size.height;
                const geometry = layoutAvatarChoice(referenceWidth);
                drawBackdrop(dc, size, REFERENCE_HEIGHT, geometry.panel);
                measured = { size, referenceWidth, geometry };
            });
        } catch (error) {
            host.removeDrawingLayer(layer);
            throw error;
        }
        return { layer, view, ...measured };
    }

    function useBackdrop({ layer, view, size, referenceWidth, geometry }) {
        Object.assign(shown, { view, size, referenceWidth, geometry, backdrop: layer });
    }

    function place(layer, rect) {
        layer.setScale({ ySpan: rect.h / REFERENCE_HEIGHT });
        layer.setPos((rect.x + rect.w / 2) / shown.referenceWidth - 0.5, 0.5 - (rect.y + rect.h / 2) / REFERENCE_HEIGHT);
    }

    // A hidden layer placed on rect and drawn in its own coordinates, kept in
    // layers before drawing, so a draw that throws leaves nothing behind once closed.
    function drawPiece(zIndex, rect, draw, layers = shown.layers) {
        const layer = host.createDrawingLayer(zIndex);
        layers.push(layer);
        layer.alpha = 0;
        layer.clear(STEAMBALL_COLORS.transparent);
        place(layer, rect);
        layer.draw(draw, rect.w, rect.h);
        return layer;
    }

    // Each piece as one step, for the opening to run in slices, once the
    // backdrop measured the window the pieces' places depend on.
    function pieceSteps() {
        const exitWord = exitButtonWordOf(EXIT_BUTTON_LOOK.BACK);
        const hints = buttonHintGroupsOf({ flippers: FLIPPER_HINT.BROWSE, select: true, exitLook: EXIT_BUTTON_LOOK.BACK });
        const geometry = () => shown.geometry;
        return [
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
    // shows only while it is selected; the confirmation, when shown, hides it
    // and takes the marker's place, the grid's set aside under it.
    function setOpacity(opacity) {
        shown.opacity = opacity;
        shown.backdrop.alpha = opacity;
        for (const layer of shown.layers) layer.alpha = opacity;
        if (shown.selected !== EXIT_BUTTON || shown.confirmation) shown.tooltip.alpha = 0;
        const { confirmation } = shown;
        if (!confirmation) {
            shown.marker.setOpacity(opacity);
            return;
        }
        for (const layer of confirmation.layers) layer.alpha = opacity;
        if (confirmation.marker) confirmation.marker.setOpacity(opacity);
    }

    function removeConfirmation() {
        const { marker, layers } = shown.confirmation;
        shown.confirmation = null;
        if (marker) marker.remove();
        for (const layer of layers) host.removeDrawingLayer(layer);
    }

    function placeMarker() {
        shown.marker = createSelectionMarker(host, { zIndex: Z_INDEX.marker, referenceWidth: shown.referenceWidth, referenceHeight: REFERENCE_HEIGHT });
        shown.marker.moveTo(selectedRect());
    }

    function removeLayers() {
        if (shown.confirmation) removeConfirmation();
        if (shown.marker) shown.marker.remove();
        if (shown.backdrop) host.removeDrawingLayer(shown.backdrop);
        for (const layer of shown.layers) host.removeDrawingLayer(layer);
        Object.assign(shown, { marker: null, backdrop: null, layers: [], tooltip: null });
    }

    // The window watch saw the view's size change: drawn again in place for
    // the new grid shape, the current portrait and the confirmation kept, the
    // fade going on. False, nothing kept, while the layers' window keeps its
    // old size. A draw that fails gives the screen up, back to the picker.
    function followWindow(previousView, nextView) {
        const previousSize = shown.size;
        const confirmed = shown.confirmation ? shown.confirmation.selected : null;
        let backdrop = null;
        try {
            backdrop = drawBackdropLayer();
            if (sameSize(backdrop.size, previousSize)) {
                host.removeDrawingLayer(backdrop.layer);
                return false;
            }
            removeLayers();
            useBackdrop(backdrop);
            for (const step of pieceSteps()) step();
            placeMarker();
            if (confirmed !== null) askToConfirm(confirmed);
        } catch (error) {
            leave();
            throw error;
        }
        setOpacity(shown.opacity);
        host.log(`[${SCRIPT_NAME}] The screen is redrawn for the window's new size: view ${sizeText(previousView)} to ${sizeText(nextView)}, layers ${sizeText(previousSize)} to ${sizeText(backdrop.size)}.`);
        return true;
    }

    // Closes the screen or gives up the one getting ready; nothing handed back.
    function close() {
        if (!shown) return;
        windowWatch.stop();
        opening.remove();
        removeLayers();
        shown = null;
    }

    // Exit, or the Exit Button: a small panel drawn over the grid asks to
    // confirm, "Choose an Avatar" current unless a redraw keeps another.
    // Drawn at once, as it is small.
    function askToConfirm(selected = CHOICE.CHOOSE_AVATAR) {
        const layout = layoutConfirmation(shown.geometry);
        const confirmation = { layout, selected, layers: [], marker: null };
        shown.confirmation = confirmation;
        shown.marker.setAside();
        try {
            drawPiece(Z_INDEX.confirmationPanel, layout.cover, dc => drawConfirmationPanel(host, dc, layout, TEXT.keepDefaultQuestion), confirmation.layers);
            for (const [choice, label] of [[CHOICE.CHOOSE_AVATAR, TEXT.chooseAvatar], [CHOICE.KEEP_DEFAULT, TEXT.keepDefault]]) {
                const rect = layout.choices[choice];
                drawPiece(Z_INDEX.confirmationChoices, rect, dc => drawConfirmationChoice(host, dc, label, rect.w, rect.h), confirmation.layers);
            }
            confirmation.marker = createSelectionMarker(host, {
                zIndex: Z_INDEX.confirmationMarker, referenceWidth: shown.referenceWidth, referenceHeight: REFERENCE_HEIGHT,
            });
            confirmation.marker.moveTo(layout.choices[confirmation.selected]);
        } catch (error) {
            // The grid stays as it was, rather than a half drawn panel.
            backToGrid();
            throw error;
        }
        setOpacity(shown.opacity);
    }

    // "Choose an Avatar", or Exit on the confirmation: the marker where it was.
    function backToGrid() {
        removeConfirmation();
        shown.marker.showAgain();
        setOpacity(shown.opacity);
    }

    // On the confirmation: Next and Prev go round both choices.
    function confirmationButton(command) {
        const { confirmation } = shown;
        if (command === "Next" || command === "Prev") {
            navigationSound.play();
            confirmation.selected = confirmation.selected === CHOICE.CHOOSE_AVATAR ? CHOICE.KEEP_DEFAULT : CHOICE.CHOOSE_AVATAR;
            confirmation.marker.moveTo(confirmation.layout.choices[confirmation.selected]);
        } else if (command === "Exit") {
            backToGrid();
        } else if (command === "Select" || command === "Launch") {
            if (confirmation.selected === CHOICE.KEEP_DEFAULT) leave();
            else backToGrid();
        }
    }

    function leave() {
        const { onClosed } = shown;
        close();
        onClosed();
    }

    // profileName: the Profile just created; onClosed(): called once the
    // screen is closed by a choice, Exit or a failed opening, or at once when
    // no portrait is readable; never by attract mode.
    function open(profileName, onClosed) {
        if (shown) return;
        opening.begin();
        const folder = `${host.getProjectFolder()}\\${AVATAR_CHOICE_FOLDER}`;
        const portraits = opening.read(() => readPortraits(host, folder));
        // Before any veil: the picker comes straight back.
        if (portraits.length === 0) {
            logError(SCRIPT_NAME, `ERROR No readable portrait in ${folder}; Avatar Choice is skipped.`, host);
            onClosed();
            return;
        }
        // Here rather than on the first move, which it would slow down.
        navigationSound.load();
        shown = {
            profileName, portraits, onClosed, selected: 0, isPreparing: true, opacity: 0,
            view: null, size: null, referenceWidth: 0, geometry: null, backdrop: null, layers: [], tooltip: null, marker: null, confirmation: null,
        };
        const pending = [() => useBackdrop(drawBackdropLayer()), ...pieceSteps()];
        opening.runVeiled(() => {
            opening.draw(pending.shift());
            return pending.length > 0;
        }, {
            onDone: () => {
                shown.isPreparing = false;
                placeMarker();
                setOpacity(0);
                opening.logOpened({ profileName });
                opening.fadeIn(setOpacity);
                // Only now, against what the backdrop measured: getting ready
                // can outlast the watch's retries.
                windowWatch.start(followWindow, shown.view);
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
        if (shown.selected === EXIT_BUTTON) return askToConfirm();
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
        if ((ev.command === "Next" || ev.command === "Prev") && !shown.confirmation) {
            if (!shown.isPreparing) move(ev.command === "Next" ? 1 : -1);
            return;
        }
        // A held button counts once, flippers included on the confirmation's two choices.
        if (ev.repeat) return;
        if (shown.confirmation) confirmationButton(ev.command);
        // Before the grid shows there is no choice to lose: Exit leaves at once.
        else if (ev.command === "Exit" && shown.isPreparing) leave();
        else if (ev.command === "Exit") askToConfirm();
        // Launch is the plunger, which selects in PinballY's own menus too.
        else if ((ev.command === "Select" || ev.command === "Launch") && !shown.isPreparing) choose();
    }));

    // Fires when the cabinet sits idle: the screen must not stay over attract
    // mode nor keep the buttons. Nothing is copied; the picker closes itself.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, close));

    return { open };
}
