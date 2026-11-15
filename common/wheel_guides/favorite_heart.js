// ============================================================
// Favorite Heart: in the very bottom left corner of the wheel screen, red when
// the selected table is a Favorite Table, grey otherwise. It reads the table's
// favourite flag, which holds the active Profile's under Ratings per Profile.
// Two image layers, each drawn once, the first time it shows; a move only shows the right one.
// - Hidden, a layer is a point (Placed layers), never a transparent full-window layer.
// ============================================================

import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { createHiddenLayer, hideLayer, placeAligned, POINT_SPAN } from "../drawing/placed_layers.js";
import { REFERENCE_HEIGHT, WHEEL_GUIDES_Z_INDEX } from "./wheel_position.js";

// Prototype values, validated on the cabinet, in px of a 1920 px high window;
// left: a share of the window's width, off its left edge.
const HEART = Object.freeze({ width: 72, height: 64 });
const MARGIN = Object.freeze({ bottom: 6, left: 0.008 });
const HEART_FILES = Object.freeze({
    favorite: "assets\\images\\favorite_heart.png",
    other: "assets\\images\\favorite_heart_off.png",
});

// Whether the Favorite Heart shows: its Add-on and its own setting on.
export const isFavoriteHeartOn = config => config.addOns.wheelGuides !== false && config.favoriteHeart !== false;

export function createFavoriteHeart(host) {
    // Each heart's layer, drawn the first time it shows.
    const hearts = {};
    function heartLayer(state) {
        if (hearts[state]) return hearts[state];
        const layer = createHiddenLayer(host, WHEEL_GUIDES_Z_INDEX);
        // Placed, still a point, before its draw, as the Wheel Position's.
        placeAligned(layer, POINT_SPAN, 0, 0);
        layer.clear(STEAMBALL_COLORS.transparent);
        // By absolute path: drawImage resolves a relative one from PinballY's folder.
        layer.draw(dc => dc.drawImage(`${host.getProjectFolder()}\\${HEART_FILES[state]}`, 0, 0, HEART.width, HEART.height),
            HEART.width, HEART.height);
        hearts[state] = layer;
        return layer;
    }
    let shownLayer = null;

    function hide() {
        if (shownLayer) hideLayer(shownLayer);
        shownLayer = null;
    }

    function show(isFavorite) {
        const layer = heartLayer(isFavorite ? "favorite" : "other");
        if (layer === shownLayer) return;
        hide();
        placeAligned(layer, { ySpan: HEART.height / REFERENCE_HEIGHT }, MARGIN.left, MARGIN.bottom / REFERENCE_HEIGHT, "bottom left");
        layer.alpha = 1;
        shownLayer = layer;
    }

    return { show, hide };
}
