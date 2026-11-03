// ============================================================
// The Status Icons' glyphs drawn by the pack, in the wheel clock's palette
// and drop shadow: the gold arrow pointing down (a Pack Update waiting) and
// the soft white circular arrow crossed out (Update Check off). Only
// drawing: no layer, no event, no side effect.
// ============================================================

import { CLOCK_COLORS } from "../clock/minute_tick.js";
import { SHADOW } from "../drawing/shadowed_text.js";

// In the row's order. Discord's is its official symbol, an image: never one
// of the glyphs below.
export const STATUS_ICON = Object.freeze({
    DISCORD: "discord",
    PACK_UPDATE_WAITING: "packUpdateWaiting",
    UPDATE_CHECK_OFF: "updateCheckOff",
});

// Distance from (u, v) to the segment from (ax, ay) to (bx, by).
function distanceToSegment(u, v, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(u - (ax + t * dx), v - (ay + t * dy));
}

function inTriangle(u, v, [[ax, ay], [bx, by], [cx, cy]]) {
    const side = (px, py, qx, qy) => (u - qx) * (py - qy) - (px - qx) * (v - qy);
    const signs = [side(ax, ay, bx, by), side(bx, by, cx, cy), side(cx, cy, ax, ay)];
    return signs.every(sign => sign >= 0) || signs.every(sign => sign <= 0);
}

// Shapes on a unit square, (0, 0) at the top left: whether (u, v) is inside.
function downArrow(u, v) {
    const inShaft = Math.abs(u - 0.5) <= 0.11 && v >= 0.04 && v <= 0.55;
    const inHead = v >= 0.45 && v <= 0.96 && Math.abs(u - 0.5) <= 0.46 * (0.96 - v) / 0.51;
    return inShaft || inHead;
}

// Clockwise, open between twelve and two o'clock, its head at twelve.
const ARROW_HEAD = [[0.5, 0.02], [0.5, 0.32], [0.7, 0.17]];

function circularArrow(u, v) {
    const radius = Math.hypot(u - 0.5, v - 0.5);
    const angle = Math.atan2(v - 0.5, u - 0.5) * 180 / Math.PI;
    const inRing = radius >= 0.27 && radius <= 0.39 && !(angle > -90 && angle < -35);
    return inRing || inTriangle(u, v, ARROW_HEAD);
}

// The stroke crosses it out, with a gap on each side so it reads apart.
function crossedCircularArrow(u, v) {
    const fromStroke = distanceToSegment(u, v, 0.1, 0.1, 0.9, 0.9);
    return fromStroke <= 0.065 || (fromStroke > 0.14 && circularArrow(u, v));
}

const GLYPHS = Object.freeze({
    [STATUS_ICON.PACK_UPDATE_WAITING]: { shape: downArrow, color: CLOCK_COLORS.gold },
    [STATUS_ICON.UPDATE_CHECK_OFF]: { shape: crossedCircularArrow, color: CLOCK_COLORS.text },
});

// The colour with its alpha scaled by opacity (0 to 1).
const withOpacity = (color, opacity) =>
    ((Math.round(((color >>> 24) & 0xFF) * opacity) << 24) | (color & 0xFFFFFF)) >>> 0;

// One fillRect per run of inside pixels on each line.
function fillShape(dc, shape, x, y, size, color) {
    for (let row = 0; row < size; row++) {
        let runStart = -1;
        for (let column = 0; column <= size; column++) {
            const inside = column < size && shape((column + 0.5) / size, (row + 0.5) / size);
            if (inside && runStart < 0) runStart = column;
            if (!inside && runStart >= 0) {
                dc.fillRect(x + runStart, y + row, column - runStart, 1, color);
                runStart = -1;
            }
        }
    }
}

// The icon in a square of size by size at (x, y), its shadow first; opacity
// (0 to 1) fades it, shadow included.
export function drawStatusIcon(dc, icon, x, y, size, opacity = 1) {
    const { shape, color } = GLYPHS[icon];
    fillShape(dc, shape, x + SHADOW.offset, y + SHADOW.offset, size, withOpacity(SHADOW.color, opacity));
    fillShape(dc, shape, x, y, size, withOpacity(color, opacity));
}
