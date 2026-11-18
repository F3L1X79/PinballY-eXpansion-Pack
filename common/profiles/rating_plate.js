// ============================================================
// Rating Plate: the active Profile's Rating of the selected table at the top
// right of the wheel screen, five stars (half stars included, empty when not
// rated) on a small plate, on top of the top right stack. No text, no lit state.
// - Every value is drawn ahead on its own layer (ADR 0010), then only shown or hidden (a point).
// - Its place is asked on each show, like the Mastery Bar's; RATING_PLATE_PIECE gives the top right stack its sizes.
// ============================================================

import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { CHALLENGE_CARD_Z_INDEX, CARD_REFERENCE_HEIGHT } from "../challenges/challenge_card.js";
import { fillStar } from "../drawing/pixel_shapes.js";
import { TOP_RIGHT_STACK } from "../drawing/top_right_stack.js";
import { createHiddenLayer, hideLayer, placeAligned, POINT_SPAN } from "../drawing/placed_layers.js";

// Above the Mastery Bar's planes, under popups and menus.
export const RATING_PLATE_Z_INDEX = CHALLENGE_CARD_Z_INDEX + 5;
export const RATING_PLATE_STAR_COLORS = Object.freeze({ filled: STEAMBALL_COLORS.gold, empty: STEAMBALL_COLORS.track });
// On the Challenge Card's 1920 px reference and canvas width: the panel's
// left edge lines up with the card's (validated on the cabinet).
const CANVAS = Object.freeze({ width: 400, height: 56 });
const PANEL = Object.freeze({ x: 10, y: 6, width: 158, height: 40, border: 1 });
// Its piece of the top right stack: the canvas's room around the panel is kept.
export const RATING_PLATE_PIECE = Object.freeze({
    place: TOP_RIGHT_STACK.RATING_PLATE,
    margins: Object.freeze({ top: PANEL.y, bottom: CANVAS.height - PANEL.y - PANEL.height }),
    height: () => CANVAS.height,
});
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
    // 0 - top: a plate at the very top is placed at 0, not -0.
    const place = (layer, span) => placeAligned(layer, span, 0, (0 - topOf()) / CARD_REFERENCE_HEIGHT, "top right");

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

    // rating: from 0 to 5, shown to the nearest half star; null (not rated)
    // shows empty stars, so the plate never comes and goes.
    function show(rating) {
        hide();
        const value = Math.min(STAR_COUNT, Math.round((rating ?? 0) * 2) / 2);
        shown = layers.get(value) || drawValue(value);
        place(shown, { ySpan: CANVAS.height / CARD_REFERENCE_HEIGHT });
        shown.alpha = 1;
    }

    return { show, hide };
}
