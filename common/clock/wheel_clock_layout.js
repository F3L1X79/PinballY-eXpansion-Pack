// ============================================================
// The wheel clock's layer and text sizes, shared by the Clock and the Status
// Icons beside it, and the width of the widest time it can show, which places
// the icons. No side effects on import.
// ============================================================

import { measureShadowedText } from "../drawing/shadowed_text.js";
import { clockTextOf } from "./minute_tick.js";

// Like the badge: above the wheel and the game info box, under popups and menus.
// Its own canvas pinned to the top left corner, for the same reason as the
// badge: a canvas drawn at startup, before the window is laid out, would
// be stretched out of shape. Sizes are the badge's scale, on the cabinet's
// 1920 px high playfield; the text's top lines up with the badge's Avatar.
export const WHEEL_CLOCK = Object.freeze({ zIndex: 4500, width: 260, height: 110, left: 30, top: 30, referenceHeight: 1920 });
export const TIME_TEXT = Object.freeze({ size: 28, weight: 600 });

// Every hour on the hour: Segoe UI's digits all have the same width, so
// only the hour's digit count and the AM/PM suffix change the width.
export function widestTimeWidth(host) {
    const widths = Array.from({ length: 24 }, (_, hours) =>
        measureShadowedText(host, TIME_TEXT, clockTextOf(new Date(2000, 0, 1, hours, 0)), WHEEL_CLOCK.width - WHEEL_CLOCK.left).width);
    return Math.max(...widths);
}
