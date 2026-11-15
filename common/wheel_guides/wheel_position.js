// ============================================================
// Wheel Position: the selected table's place out of the wheel's tables
// (17/100) in the very bottom right corner of the wheel screen, bold
// shadowed text on its own layer, redrawn only when the text changes.
// Also says whether it is on, which takes "Table n/total" off the status line.
// - Hidden, it is a point (Placed layers), never a transparent full-window layer.
// ============================================================

import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { RATING_PLATE_Z_INDEX } from "../profiles/rating_plate.js";
import { drawShadowedText } from "../drawing/shadowed_text.js";
import { createHiddenLayer, hideLayer, placeAligned, POINT_SPAN } from "../drawing/placed_layers.js";

// Above the Rating Plate, under popups and menus.
export const WHEEL_GUIDES_Z_INDEX = RATING_PLATE_Z_INDEX + 1;
// Prototype values, validated on the cabinet, in px of a 1920 px high window;
// right: a share of the window's width, off its right edge.
export const REFERENCE_HEIGHT = 1920;
const CANVAS = Object.freeze({ width: 200, height: 44 });
const TEXT = Object.freeze({ size: 24, weight: 700, top: 2 });
const MARGIN = Object.freeze({ bottom: 4, right: 0.008 });

// Whether the Wheel Position shows: its Add-on and its own setting on.
export const isWheelPositionOn = config => config.addOns.wheelGuides !== false && config.wheelPosition !== false;

export const wheelPositionText = (place, count) => `${place}/${count}`;

export function createWheelPosition(host) {
    const layer = createHiddenLayer(host, WHEEL_GUIDES_Z_INDEX);
    // Placed, still a point, before its first draw: on the cabinet, a layer
    // drawn before it was placed never showed.
    placeAligned(layer, POINT_SPAN, 0, 0);
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
        placeAligned(layer, { ySpan: CANVAS.height / REFERENCE_HEIGHT }, -MARGIN.right, MARGIN.bottom / REFERENCE_HEIGHT, "bottom right");
        layer.alpha = 1;
        isShown = true;
    }

    return { show, hide };
}
