// ============================================================
// Placed layers: creating, placing in reference pixels, hiding, showing
// again and removing the drawing layers of the pack. A hidden layer is
// always reduced to a point: PinballY otherwise stretches it to the whole
// window and fills every pixel of it each frame, even invisible.
// - Owns the scale, never the opacity: the screen still writes alpha to show.
// - Never calls clear(): each caller keeps clearing its layers as before.
// ============================================================

export const POINT_SPAN = Object.freeze({ xSpan: 0.001, ySpan: 0.001 });
// PinballY's default span: the whole window.
const WINDOW_SPAN = Object.freeze({ xSpan: 1, ySpan: 1 });

export function hideLayer(layer) {
    layer.alpha = 0;
    layer.setScale(POINT_SPAN);
}

// Still measures the window: a draw without a size gets a canvas the size of the window.
export function createHiddenLayer(host, zIndex) {
    const layer = host.createDrawingLayer(zIndex);
    hideLayer(layer);
    return layer;
}

// Where a canvas on rect (in reference pixels, from the window's top left)
// shows: its span of the window's height and its centre's position.
export function placementOf(rect, referenceWidth, referenceHeight) {
    return {
        ySpan: rect.h / referenceHeight,
        x: (rect.x + rect.w / 2) / referenceWidth - 0.5,
        y: 0.5 - (rect.y + rect.h / 2) / referenceHeight,
    };
}

// The layers of one screen, its window referenceHeight reference pixels
// tall, or in the window's own pixels without one (measured while every
// layer is hidden). A layer never placed shows at the window's size, like a backdrop.
export function createPlacedLayers(host, { referenceHeight: fixedHeight = null } = {}) {
    // Each layer's rect (null: the window), whether it shows, and the ySpan
    // it shows at on its rect (null at the window's size); a new window's
    // measure changes it for the same rect.
    const records = new Map();
    let referenceHeight = fixedHeight;
    let referenceWidth = 0;

    const newRecord = () => ({ rect: null, isShown: false, ySpan: null });

    // A layer from elsewhere is taken as hidden, not yet placed.
    function recordOf(layer) {
        if (!records.has(layer)) records.set(layer, newRecord());
        return records.get(layer);
    }

    function applyScale(layer, record) {
        record.ySpan = record.rect === null ? null : record.rect.h / referenceHeight;
        layer.setScale(record.rect === null ? WINDOW_SPAN : { ySpan: record.ySpan });
    }

    return {
        get referenceWidth() { return referenceWidth; },
        // size: the window's, as a draw without a size measures it.
        measure(size) {
            if (fixedHeight === null) referenceHeight = size.height;
            referenceWidth = referenceHeight * size.width / size.height;
        },
        isShown: layer => records.has(layer) && records.get(layer).isShown,
        create(zIndex) {
            const layer = createHiddenLayer(host, zIndex);
            records.set(layer, newRecord());
            return layer;
        },
        // Moved at once; a hidden layer stays a point until shown, and a
        // shown one keeping its span is only moved, as a glide's frame needs.
        place(layer, rect) {
            const record = recordOf(layer);
            record.rect = rect;
            const { x, y } = placementOf(rect, referenceWidth, referenceHeight);
            if (record.isShown && record.ySpan !== rect.h / referenceHeight) applyScale(layer, record);
            layer.setPos(x, y);
        },
        hide(layer) {
            recordOf(layer).isShown = false;
            hideLayer(layer);
        },
        // Back at its size; nothing to do for a layer already shown, so a
        // fade frame changes no more than the alpha the screen sets.
        show(layer) {
            const record = recordOf(layer);
            if (record.isShown) return;
            record.isShown = true;
            applyScale(layer, record);
        },
        remove(layer) {
            records.delete(layer);
            host.removeDrawingLayer(layer);
        },
    };
}
