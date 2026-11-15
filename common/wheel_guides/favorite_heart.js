// ============================================================
// Favorite Heart: in the very bottom left corner of the wheel screen, red when
// the selected table is a Favorite Table, grey otherwise. It reads the table's
// favourite flag, which holds the active Profile's under Ratings per Profile.
// Two image layers, each drawn once, the first time it shows; a move only shows the right one.
// ============================================================

import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { hideLayer } from "../drawing/placed_layers.js";
import { createGuideLayer, isGuideOn, showGuideLayer } from "./guide_layers.js";

// Prototype values, in reference px; left: a share of the window's width, off its left edge.
const HEART = Object.freeze({ width: 72, height: 64 });
const MARGIN = Object.freeze({ bottom: 6, left: 0.008 });
const HEART_FILES = Object.freeze({
    favorite: "assets\\images\\favorite_heart.png",
    other: "assets\\images\\favorite_heart_off.png",
});

export const isFavoriteHeartOn = config => isGuideOn(config, "favoriteHeart");

export function createFavoriteHeart(host) {
    // Each heart's layer, drawn the first time it shows.
    const hearts = {};
    function heartLayer(state) {
        if (hearts[state]) return hearts[state];
        const layer = createGuideLayer(host);
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
        showGuideLayer(layer, { height: HEART.height, x: MARGIN.left, y: MARGIN.bottom, align: "bottom left" });
        shownLayer = layer;
    }

    return { show, hide };
}
