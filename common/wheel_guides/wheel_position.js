// ============================================================
// Wheel Position: the selected table's place out of the wheel's tables
// (17/100) in the very bottom right corner of the wheel screen, bold
// shadowed text on its own layer, redrawn only when the text changes.
// Also says whether it is on, which takes "Table n/total" off the status line.
// ============================================================

import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { drawShadowedText } from "../drawing/shadowed_text.js";
import { hideLayer } from "../drawing/placed_layers.js";
import { createGuideLayer, isGuideOn, showGuideLayer } from "./guide_layers.js";

// Prototype values, in reference px; right: a share of the window's width, off its right edge.
const CANVAS = Object.freeze({ width: 200, height: 44 });
const TEXT = Object.freeze({ size: 24, weight: 700, top: 2 });
const MARGIN = Object.freeze({ bottom: 4, right: 0.008 });

export const isWheelPositionOn = config => isGuideOn(config, "wheelPosition");

export const wheelPositionText = (place, count) => `${place}/${count}`;

export function createWheelPosition(host) {
    const layer = createGuideLayer(host);
    let drawnText = null;
    let isShown = false;

    function hide() {
        if (isShown) hideLayer(layer);
        isShown = false;
    }

    function show(place, count) {
        const text = wheelPositionText(place, count);
        if (text !== drawnText) {
            layer.clear(STEAMBALL_COLORS.transparent);
            layer.draw(dc => drawShadowedText(host, dc, TEXT, STEAMBALL_COLORS.title, text, TEXT.top, { align: "right" }),
                CANVAS.width, CANVAS.height);
            drawnText = text;
        }
        if (isShown) return;
        showGuideLayer(layer, { height: CANVAS.height, x: -MARGIN.right, y: MARGIN.bottom, align: "bottom right" });
        isShown = true;
    }

    return { show, hide };
}
