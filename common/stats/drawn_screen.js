// ============================================================
// Drawn screen: the layer plumbing shared by the Profile Stats, the Household
// Stats and the High Score Board, built on the placed layers: placing, fading
// in, setting aside and removing. openDrawnScreen() draws at once;
// prepareDrawnScreen() goes through the shared screen opening (docs/adr/0014).
// - Layers kept apart (other) or hidden alone go through the screen's show() and hide().
// ============================================================

import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { createScreenOpening, fadeIn, FRAME_MS } from "../drawing/screen_opening.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";

export { FRAME_MS };

// The layers, their placing and fade in, shared by both openings.
function createScreenLayers(host, scriptName, referenceHeight) {
    const placed = createPlacedLayers(host, { referenceHeight });
    const layers = [];
    let stopFade = () => {};

    function hiddenLayer(zIndex) {
        const layer = placed.create(zIndex);
        layer.clear(STEAMBALL_COLORS.transparent);
        return layer;
    }

    // Every layer of the screen at its size; their alpha is the screen's to set.
    function showAll() {
        for (const layer of layers) placed.show(layer);
    }

    return {
        layers,
        // rect in reference pixels, from the window's top left.
        place: placed.place,
        // A layer the screen hides alone (a tooltip, a row out of view), or
        // shows again at its size before setting its alpha.
        hide: placed.hide,
        show: placed.show,
        // A layer kept apart (other), removed before the screen closes.
        remove: placed.remove,
        showAll,
        // Known once the backdrop is drawn: PinballY draws a layer within draw().
        get referenceWidth() { return placed.referenceWidth; },
        // drawBackdrop(dc, size, referenceWidth): dims the wheel behind the panel.
        drawBackdrop(zIndex, drawBackdrop) {
            const backdrop = hiddenLayer(zIndex);
            // Kept before drawing, so a draw that throws leaves nothing behind once closed.
            layers.unshift(backdrop);
            backdrop.draw(dc => {
                const size = dc.getSize();
                placed.measure(size);
                drawBackdrop(dc, size, placed.referenceWidth);
            });
        },
        // A hidden layer placed on rect and drawn in its own coordinates,
        // canvas.w by canvas.h (rect's size by default, another one
        // stretched to rect), kept in into (the screen's layers by default).
        drawPiece(zIndex, rect, draw, into = layers, canvas = rect) {
            const layer = hiddenLayer(zIndex);
            into.push(layer);
            placed.place(layer, rect);
            layer.draw(draw, canvas.w, canvas.h);
            return layer;
        },
        // Every layer at its size, then setOpacity(opacity) every frame, from
        // 0 to 1, then onFaded().
        fadeIn(setOpacity, onFaded) {
            showAll();
            stopFade = fadeIn(host, scriptName, setOpacity, onFaded);
        },
        // Every layer hidden and reduced to a point, those of other included.
        setAside(other = []) {
            stopFade();
            for (const layer of [...layers, ...other]) placed.hide(layer);
        },
        // Every layer back at its size, then setOpacity(1): the screen
        // hides again those it keeps hidden, and shows again those it set
        // aside apart (other), which stay reduced to a point until then.
        showAgain(setOpacity) {
            showAll();
            setOpacity(1);
        },
        // Removes the layers, those of other included; safe to call again.
        close(other = []) {
            stopFade();
            for (const layer of [...layers, ...other]) placed.remove(layer);
            layers.length = 0;
            other.length = 0;
        },
    };
}

// referenceHeight: the window's height in reference pixels;
// drawBackdrop(dc, size, referenceWidth): dims the wheel behind the panel.
// Draws the backdrop at once; the screen draws its pieces at once too.
export function openDrawnScreen(host, scriptName, { referenceHeight, backdropZIndex, drawBackdrop }) {
    const screen = createScreenLayers(host, scriptName, referenceHeight);
    screen.drawBackdrop(backdropZIndex, drawBackdrop);
    return screen;
}

// The shared opening of a screen the player waits for. referenceHeight:
// the window's height in reference pixels; drawingAhead: the shared drawing
// ahead (common/core/drawing_ahead.js); profileName and isReadOnly: whose
// screen the timing line names (common/drawing/screen_opening.js);
// readSplit(): the line's reading time split by reader, asked once the
// steps are over (null: none). The
// screen queues its steps with read(step) and draw(step), each doing one
// thing (a step may queue more), draws within them with drawBackdrop(draw)
// and drawPiece(), then calls start(). The veil and Loader sit just under
// the backdrop.
export function prepareDrawnScreen(host, scriptName, {
    referenceHeight, backdropZIndex, drawingAhead, profileName = null, isReadOnly = false, readSplit = null,
}) {
    const screen = createScreenLayers(host, scriptName, referenceHeight);
    const opening = createScreenOpening(host, scriptName, { zIndex: backdropZIndex - 2, drawingAhead });
    // Each step with whether it reads or draws, first come first run.
    const steps = [];

    // Gives up the opening or closes the open screen: the veil, the Loader
    // and the layers go, those of other included; safe to call again.
    function close(other = []) {
        opening.remove();
        screen.close(other);
    }

    // One step of the foreground queue: the next one, timed by its kind.
    function runNextStep() {
        const { kind, step } = steps.shift();
        opening[kind](step);
        return steps.length > 0;
    }

    return {
        layers: screen.layers,
        place: screen.place,
        hide: screen.hide,
        show: screen.show,
        get referenceWidth() { return screen.referenceWidth; },
        drawBackdrop: draw => screen.drawBackdrop(backdropZIndex, draw),
        drawPiece: screen.drawPiece,
        read(step) { steps.push({ kind: "read", step }); },
        draw(step) { steps.push({ kind: "draw", step }); },
        // Once ready: hidden while a child screen is open, the veil and the
        // fade in gone.
        setAside(other = []) {
            opening.remove();
            screen.setAside(other);
        },
        // At once, without a veil, a fade in nor an opening time line.
        showAgain: screen.showAgain,
        // Dims the wheel at once and runs the steps; once they are over,
        // onReady() (the screen set up, its layers at their size, still
        // transparent), then the fade in through setOpacity(opacity).
        // onFailed(): a step threw (logged) and the opening is given up,
        // everything already removed.
        start({ onReady, setOpacity, onFailed }) {
            opening.begin();
            opening.runVeiled(runNextStep, {
                onDone: () => {
                    opening.logOpened({ profileName, isReadOnly, readSplit: readSplit ? readSplit() : null });
                    screen.showAll();
                    onReady();
                    opening.fadeIn(setOpacity);
                },
                onFailed: () => {
                    close();
                    onFailed();
                },
            });
        },
        close,
    };
}
