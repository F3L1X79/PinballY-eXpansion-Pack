// ============================================================
// Reads a drawn screen's Button Hints as the player sees them, on the fake
// host: the key caps groups and their words, the Exit Button's tooltip, and
// where a layer shows, to check that a footer fits. Never loaded by PinballY.
// ============================================================

import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { shownLayers } from "./shown_layers.js";

const textStrokes = strokes => strokes.filter(stroke => "text" in stroke);

// strokes: a layer's strokes(), or the part of them in a footer band.
// Returns [{ keys: [key cap texts], label }], left to right.
export function readButtonHints(strokes) {
    const groups = [];
    let keys = [];
    for (const stroke of [...textStrokes(strokes)].sort((a, b) => a.rect.x - b.rect.x)) {
        if (stroke.color === STEAMBALL_COLORS.description) {
            groups.push({ keys, label: stroke.text });
            keys = [];
        } else {
            keys.push(stroke.text);
        }
    }
    return groups;
}

// The groups of the shown footer layer at that z-index, null when none shows.
export function buttonHintsOn(fake, zIndex) {
    const [layer] = shownLayers(fake, zIndex);
    return layer ? readButtonHints(layer.strokes()) : null;
}

// The Button Hints a screen should show, in capitals as drawn, from the
// shared texts (lang.buttonHints): flippers "browse", "scroll" or null,
// select whether Select chooses (or its word when not "Choose"), exit "back" or "close".
export function expectedButtonHints(lang, { flippers = "browse", select = true, exit }) {
    const TEXT = lang.buttonHints;
    const upper = text => text.toLocaleUpperCase();
    return [
        ...(flippers ? [{ keys: [upper(TEXT.keyCaps.prev), upper(TEXT.keyCaps.next)], label: upper(TEXT[flippers]) }] : []),
        ...(select ? [{ keys: [upper(TEXT.keyCaps.select)], label: upper(typeof select === "string" ? select : TEXT.choose) }] : []),
        { keys: [upper(TEXT.keyCaps.exit)], label: upper(TEXT[exit]) },
    ];
}

// The Exit Button's tooltip shown on the layer at that z-index ("Back" or
// "Close"), null while hidden.
export function exitButtonTooltipOn(fake, zIndex) {
    const [layer] = shownLayers(fake, zIndex);
    return layer ? layer.texts()[0] || null : null;
}

// Where a layer shows in a window of that size: PinballY centres it on its
// position and scales it to ySpan of the window's height, its canvas's
// aspect kept.
export function windowRect(layer, { width, height }) {
    const canvas = layer.canvasSize();
    const h = layer.scale().ySpan * height;
    const w = h * canvas.width / canvas.height;
    const cx = (layer.position().x + 0.5) * width;
    const cy = (0.5 - layer.position().y) * height;
    return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 };
}

// Whether every text of that layer sits inside its canvas.
export function textsInsideLayer(layer) {
    const canvas = layer.canvasSize();
    return textStrokes(layer.strokes()).every(({ rect }) =>
        rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= canvas.width + 2 && rect.y + rect.height <= canvas.height);
}
