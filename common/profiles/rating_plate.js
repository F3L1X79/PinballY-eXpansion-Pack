// ============================================================
// Rating Plate: the active Profile's Rating of the selected table at the top
// right of the wheel screen, five stars (half stars included) on a small
// plate, under the Mastery Bar or in its place. No text, no lit state.
// - Every value is drawn ahead on its own layer (ADR 0010), then only shown or hidden (a point).
// - Its place is asked on each show, like the Mastery Bar's.
// ============================================================

import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { CHALLENGE_CARD_Z_INDEX, CARD_REFERENCE_HEIGHT } from "../challenges/challenge_card.js";
import { fillStar } from "../drawing/pixel_shapes.js";
import { createHiddenLayer, hideLayer, placeAligned, POINT_SPAN } from "../drawing/placed_layers.js";

// Above the Mastery Bar's planes, under popups and menus.
export const RATING_PLATE_Z_INDEX = CHALLENGE_CARD_Z_INDEX + 5;
export const RATING_PLATE_STAR_COLORS = Object.freeze({ filled: STEAMBALL_COLORS.gold, empty: STEAMBALL_COLORS.track });
// On the Challenge Card's 1920 px reference; the panel's right edge lines up
// with the Mastery Bar's and the Challenge Card's, 30 px from the canvas's.
const CANVAS = Object.freeze({ width: 190, height: 56 });
const PANEL = Object.freeze({ x: 2, y: 6, width: 158, height: 40, border: 1 });
const STAR = Object.freeze({ radius: 11, gap: 6 });
const STAR_COUNT = 5;
// 0 to 5 in half steps, as PinballY's rating takes them.
const RATINGS = Array.from({ length: 2 * STAR_COUNT + 1 }, (_, i) => i / 2);

function drawPlate(dc, rating) {
    dc.fillRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, STEAMBALL_COLORS.panelTranslucent);
    dc.frameRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, PANEL.border, STEAMBALL_COLORS.border);
    const rowWidth = STAR_COUNT * 2 * STAR.radius + (STAR_COUNT - 1) * STAR.gap;
    const firstX = PANEL.x + Math.round((PANEL.width - rowWidth) / 2) + STAR.radius;
    const centerY = PANEL.y + PANEL.height / 2;
    for (let star = 0; star < STAR_COUNT; star++) {
        const centerX = firstX + star * (2 * STAR.radius + STAR.gap);
        // Each star in two halves, gold up to the Rating.
        const colorUpTo = reached => RATING_PLATE_STAR_COLORS[rating >= star + reached ? "filled" : "empty"];
        fillStar(dc, centerX, centerY, STAR.radius, colorUpTo(0.5), { maxX: centerX });
        fillStar(dc, centerX, centerY, STAR.radius, colorUpTo(1), { minX: centerX });
    }
}

// topOf: how far below the window's top the plate sits, in reference px.
export function createRatingPlate(host, drawingAhead, { topOf }) {
    // Drawn layers by Rating.
    const layers = new Map();
    let shown = null;

    // At span (the plate's, or a point's while hidden) and in place.
    const place = (layer, span) => placeAligned(layer, span, 0, -topOf() / CARD_REFERENCE_HEIGHT, "top right");

    function drawValue(rating) {
        const layer = createHiddenLayer(host, RATING_PLATE_Z_INDEX);
        // Placed, still a point, before its first draw: on the cabinet, a
        // layer drawn before it was placed never showed.
        place(layer, POINT_SPAN);
        layer.clear(STEAMBALL_COLORS.transparent);
        layer.draw(dc => drawPlate(dc, rating), CANVAS.width, CANVAS.height);
        layers.set(rating, layer);
        return layer;
    }

    drawingAhead.add(() => {
        const missing = RATINGS.find(rating => !layers.has(rating));
        if (missing === undefined) return false;
        drawValue(missing);
        return true;
    });

    function hide() {
        if (shown) hideLayer(shown);
        shown = null;
    }

    // rating: from 0 to 5, shown to the nearest half star; null for no plate.
    function show(rating) {
        hide();
        if (rating === null) return;
        const value = Math.min(STAR_COUNT, Math.round(rating * 2) / 2);
        shown = layers.get(value) || drawValue(value);
        place(shown, { ySpan: CANVAS.height / CARD_REFERENCE_HEIGHT });
        shown.alpha = 1;
    }

    return { show, hide };
}
