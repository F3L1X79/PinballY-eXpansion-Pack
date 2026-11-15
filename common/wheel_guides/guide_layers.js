// ============================================================
// Guide layers: what the Wheel Guides share. Their z-index, the reference
// height their sizes are given in, whether a guide is on, and their layers,
// created hidden and shown at a size and place in reference pixels.
// - Hidden, a layer is a point (Placed layers), never a transparent full-window layer.
// ============================================================

import { RATING_PLATE_Z_INDEX } from "../profiles/rating_plate.js";
import { createHiddenLayer, placeAligned, POINT_SPAN } from "../drawing/placed_layers.js";

// Above the Rating Plate, under popups and menus.
export const WHEEL_GUIDES_Z_INDEX = RATING_PLATE_Z_INDEX + 1;
// The prototype's values, validated on the cabinet, are in px of a 1920 px high window.
export const REFERENCE_HEIGHT = 1920;

// Whether a guide shows: the Wheel Guides Add-on and the guide's own setting on.
export const isGuideOn = (config, settingKey) => config.addOns.wheelGuides !== false && config[settingKey] !== false;

export function createGuideLayer(host, zIndex = WHEEL_GUIDES_Z_INDEX) {
    const layer = createHiddenLayer(host, zIndex);
    // Placed, still a point, before its first draw: on the cabinet, a layer
    // drawn before it was placed never showed.
    placeAligned(layer, POINT_SPAN, 0, 0);
    return layer;
}

// height and y in reference px (y up from the window's centre, or from the
// edge align names); x a share of the window's width, as the help's setPos.
export function showGuideLayer(layer, { height, x, y, align }) {
    placeAligned(layer, { ySpan: height / REFERENCE_HEIGHT }, x, y / REFERENCE_HEIGHT, align);
    layer.alpha = 1;
}
