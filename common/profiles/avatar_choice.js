// ============================================================
// Avatar Choice: the drawn screen, over the Profile picker, where a Profile
// Name Entry just created takes one of the pack's readable portraits, copied
// as its avatar.png by Select or Launch; Exit asks, on a panel, before keeping
// the Default Avatar. Both hand back to the picker, as does having no portrait;
// attract mode closes everything, copying nothing. Plays its sound as it shows; redrawn on a resize.
// - Exit while still opening leaves at once, unasked: no choice can be lost yet.
// - Moving only moves the Selection Marker: the portraits are drawn once, at opening.
// - Buttons and attract mode, its confirmation's too, go through the Drawn Screen controls, set up before the Profile picker's listener.
// - Opens through the shared screen opening (docs/adr/0014).
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler, logHandlerError } from "../core/safe_handler.js";
import { logError } from "../core/error_log.js";
import { createNavigationSound } from "../core/navigation_sound.js";
import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { createSelectionMarker } from "../drawing/selection_marker.js";
import { createScreenOpening } from "../drawing/screen_opening.js";
import { createWindowRedraw } from "../drawing/window_redraw.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";
import { drawExitButton, exitTooltipRectOf, drawExitTooltip, drawButtonHintsBand, EXIT_BUTTON_LOOK } from "../drawing/steamball_drawing.js";
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

// drawingAhead: the shared drawing ahead (common/core/drawing_ahead.js);
// drawnScreenControls: the shared Drawn Screen controls (common/core/drawn_screen_controls.js);
// soundFile: played once as the screen shows, empty for none.
export function createAvatarChoice(host, { profileStore, drawingAhead, drawnScreenControls, soundFile = "" }) {
    const { profiles: { avatarChoice: TEXT } } = lang;
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    // A sound that cannot play is logged and never stops the screen.
    const playOpeningSound = safeHandler(SCRIPT_NAME, () => {
        if (soundFile) host.playSound(soundFile);
    });
    const opening = createScreenOpening(host, SCRIPT_NAME, { zIndex: Z_INDEX.backdrop - 2, drawingAhead });
    const placed = createPlacedLayers(host, { referenceHeight: REFERENCE_HEIGHT });
    const windowRedraw = createWindowRedraw(host, SCRIPT_NAME, { placed, zIndex: Z_INDEX.backdrop, referenceHeight: REFERENCE_HEIGHT, layout: layoutAvatarChoice });
    // Here, before the Profile picker adds its own button listener.
    const controls = drawnScreenControls.register(SCRIPT_NAME);
    // The open screen, null when closed: the Profile's name, the portraits'
    // paths, the selected portrait's index (or EXIT_BUTTON), what closing
    // hands back to, its place among the Drawn Screen controls, its layout
    // and its layers (null marker while getting ready), and the Exit
    // confirmation while it shows.
    let shown = null;

    function useBackdrop({ layer, referenceWidth, geometry }) {
        Object.assign(shown, { referenceWidth, geometry, backdrop: layer });
    }

    // A hidden layer placed on rect and drawn in its own coordinates, kept in
    // layers before drawing, so a draw that throws leaves nothing behind once closed.
    function drawPiece(zIndex, rect, draw, layers = shown.layers) {
        const layer = placed.create(zIndex);
        layers.push(layer);
        layer.clear(STEAMBALL_COLORS.transparent);
        placed.place(layer, rect);
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

    function showWithOpacity(layers, opacity) {
        for (const layer of layers) {
            placed.show(layer);
            layer.alpha = opacity;
        }
    }

    // Each frame of the fade in, and each move. The Exit Button's tooltip
    // shows only while it is selected; the confirmation, when shown, hides it
    // and takes the marker's place, the grid's set aside under it.
    function setOpacity(opacity) {
        shown.opacity = opacity;
        showWithOpacity([shown.backdrop, ...shown.layers.filter(layer => layer !== shown.tooltip)], opacity);
        if (shown.selected === EXIT_BUTTON && !shown.confirmation) showWithOpacity([shown.tooltip], opacity);
        else if (placed.isShown(shown.tooltip)) placed.hide(shown.tooltip);
        const { confirmation } = shown;
        if (!confirmation) {
            shown.marker.setOpacity(opacity);
            return;
        }
        showWithOpacity(confirmation.layers, opacity);
        if (confirmation.marker) confirmation.marker.setOpacity(opacity);
    }

    function removeConfirmation() {
        const { marker, layers } = shown.confirmation;
        shown.confirmation = null;
        if (marker) marker.remove();
        for (const layer of layers) placed.remove(layer);
    }

    function placeMarker() {
        shown.marker = createSelectionMarker(host, { zIndex: Z_INDEX.marker, referenceWidth: shown.referenceWidth, referenceHeight: REFERENCE_HEIGHT });
        shown.marker.moveTo(selectedRect());
    }

    function removeLayers() {
        if (shown.confirmation) removeConfirmation();
        if (shown.marker) shown.marker.remove();
        if (shown.backdrop) placed.remove(shown.backdrop);
        for (const layer of shown.layers) placed.remove(layer);
        Object.assign(shown, { marker: null, backdrop: null, layers: [], tooltip: null });
    }

    // Redrawn for a new window size and grid shape: the current portrait stays
    // in shown, the confirmation is asked again on its current choice, the
    // fade goes on. A redraw that fails gives the screen up, back to the picker.
    const followedScreen = {
        keep() {
            const confirmed = shown.confirmation ? shown.confirmation.selected : null;
            return () => {
                placeMarker();
                if (confirmed !== null) askToConfirm(confirmed);
                setOpacity(shown.opacity);
            };
        },
        removeLayers, useBackdrop, pieceSteps, onFailed: () => leave(),
    };

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

    // Run by the Drawn Screen controls on every close, attract mode included.
    function remove() {
        windowRedraw.stop();
        opening.remove();
        removeLayers();
        shown = null;
    }

    // A choice, Exit or a failed draw: closed, then handed back to the picker.
    function leave() {
        if (!shown) return;
        const { onClosed, controlled } = shown;
        controlled.close();
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
            controlled: controls.open({ onMove: move, onChoose: choose, onExit: exit, close: remove }),
            referenceWidth: 0, geometry: null, backdrop: null, layers: [], tooltip: null, marker: null, confirmation: null,
        };
        const pending = [() => useBackdrop(windowRedraw.drawOpeningBackdrop()), ...pieceSteps()];
        opening.runVeiled(() => {
            opening.draw(pending.shift());
            return pending.length > 0;
        }, {
            onDone: () => {
                shown.isPreparing = false;
                shown.controlled.ready();
                placeMarker();
                setOpacity(0);
                opening.logOpened({ profileName });
                opening.fadeIn(setOpacity);
                playOpeningSound();
                windowRedraw.start(followedScreen);
            },
            // Logged by the drawing ahead: the picker comes back on the Profile.
            onFailed: leave,
        });
    }

    // direction: 1 for Next, -1 for Prev, through the Exit Button then each
    // portrait; on the confirmation, round both choices.
    function move(direction, isRepeat) {
        navigationSound.play(direction, isRepeat);
        const { confirmation } = shown;
        if (confirmation) {
            confirmation.selected = confirmation.selected === CHOICE.CHOOSE_AVATAR ? CHOICE.KEEP_DEFAULT : CHOICE.CHOOSE_AVATAR;
            confirmation.marker.moveTo(confirmation.layout.choices[confirmation.selected]);
            return;
        }
        shown.selected = stepThroughExitButton(shown.selected, direction, shown.portraits.length);
        shown.marker.moveTo(selectedRect());
        setOpacity(shown.opacity);
    }

    // Before the grid shows there is no choice to lose: Exit leaves at once.
    function exit() {
        if (shown.isPreparing) leave();
        else if (shown.confirmation) backToGrid();
        else askToConfirm();
    }

    // A portrait is taken at once; a copy that fails keeps the Default Avatar.
    function choose() {
        const { confirmation } = shown;
        if (confirmation && confirmation.selected === CHOICE.KEEP_DEFAULT) return leave();
        if (confirmation) return backToGrid();
        if (shown.selected === EXIT_BUTTON) return askToConfirm();
        try {
            profileStore.giveAvatar(shown.profileName, shown.portraits[shown.selected]);
        } catch (error) {
            // It answers what the player just chose, on the screen: no Error Toast.
            logHandlerError(SCRIPT_NAME, error);
        }
        return leave();
    }

    return { open };
}
