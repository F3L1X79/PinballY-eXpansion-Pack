// ============================================================
// Window redraw: how a Drawn Screen laid out on its backdrop follows a change
// of window size. The backdrop measures the layers' window and lays the
// screen out; while the screen is open the window watch reads the view, and a
// layers' window of a new size has the screen drawn again in place, logged.
// - Nothing of the screen is touched until a new backdrop measured a new size: until then the watch tries again.
// - A redraw that throws hands the screen to onFailed(), never leaving half of it shown.
// ============================================================

import { createWindowWatch, readViewSize, sameSize, sizeText } from "../core/window_watch.js";
import { drawBackdrop } from "./steamball_drawing.js";

// placed: the screen's placed layers (common/drawing/placed_layers.js);
// zIndex: the backdrop's; layout(referenceWidth): the screen's geometry,
// whose panel the backdrop draws.
export function createWindowRedraw(host, scriptName, { placed, zIndex, referenceHeight, layout }) {
    const watch = createWindowWatch(host, scriptName);
    // The view read and the layers' window measured by the backdrop in use.
    let drawnFor = { view: null, size: null };

    // A draw that throws leaves no layer behind. Never placed: it shows over the whole window.
    function measureBackdrop() {
        const view = readViewSize(host, scriptName);
        const layer = placed.create(zIndex);
        let measured = null;
        try {
            layer.draw(dc => {
                const size = dc.getSize();
                placed.measure(size);
                const geometry = layout(placed.referenceWidth);
                drawBackdrop(dc, size, referenceHeight, geometry.panel);
                measured = { size, referenceWidth: placed.referenceWidth, geometry };
            });
        } catch (error) {
            placed.remove(layer);
            throw error;
        }
        return { layer, view, ...measured };
    }

    // The backdrop the screen opens on: { layer, referenceWidth, geometry }, the layer the screen's.
    function drawBackdropLayer() {
        const { layer, view, size, referenceWidth, geometry } = measureBackdrop();
        drawnFor = { view, size };
        return { layer, referenceWidth, geometry };
    }

    // Told by the window watch: false, nothing kept, while the layers' window keeps its old size.
    function follow(screen, previousView, nextView) {
        const previousSize = drawnFor.size;
        let backdrop = null;
        let isHandedOver = false;
        try {
            backdrop = measureBackdrop();
            if (sameSize(backdrop.size, previousSize)) {
                placed.remove(backdrop.layer);
                return false;
            }
            const restore = screen.keep();
            screen.removeLayers();
            drawnFor = { view: backdrop.view, size: backdrop.size };
            isHandedOver = true;
            screen.useBackdrop({ layer: backdrop.layer, referenceWidth: backdrop.referenceWidth, geometry: backdrop.geometry });
            for (const step of screen.pieceSteps()) step();
            restore();
        } catch (error) {
            if (backdrop && !isHandedOver) placed.remove(backdrop.layer);
            screen.onFailed();
            throw error;
        }
        host.log(`[${scriptName}] The screen is redrawn for the window's new size: view ${sizeText(previousView)} to ${sizeText(nextView)}, layers ${sizeText(previousSize)} to ${sizeText(backdrop.size)}.`);
        return true;
    }

    // Once the screen shows, against the view its backdrop was drawn for:
    // getting ready can outlast the watch's retries. screen: keep() returns
    // what restores the screen's state once redrawn; removeLayers();
    // useBackdrop(backdrop), as drawBackdrop() returns it; pieceSteps(), the
    // steps drawing every other piece; onFailed(), a redraw threw (logged).
    function start(screen) {
        watch.start((previousView, nextView) => follow(screen, previousView, nextView), drawnFor.view);
    }

    return { drawBackdrop: drawBackdropLayer, start, stop: watch.stop };
}
