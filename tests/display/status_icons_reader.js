// ============================================================
// Reads the Status Icons as the player sees them beside the wheel's clock:
// which icons, left to right, where, and how opaque, from the colours of
// their fills. Never loaded by PinballY.
// ============================================================

import assert from "node:assert/strict";

// The wheel clock's z-index, which the Status Icons share.
export const STATUS_ICONS_Z = 4500;
export const PACK_UPDATE_WAITING = "packUpdateWaiting";
export const UPDATE_CHECK_OFF = "updateCheckOff";

// The clock's gold for a waiting Pack Update, its soft white for the
// Update Check off; the drop shadow is left out.
const ICON_OF_COLOR = { 0xE8B84A: PACK_UPDATE_WAITING, 0xDCDCDC: UPDATE_CHECK_OFF };

// The Status Icons' layer: the clock's draws text, theirs never does.
export function statusIconsLayer(fake) {
    const layers = fake.drawingLayers().filter(layer => layer.zIndex === STATUS_ICONS_Z && layer.texts().length === 0);
    assert.ok(layers.length <= 1, "one Status Icons layer at most");
    return layers[0] || null;
}

// The icons drawn, left to right: { icon, left, top, bottom, alpha }, alpha
// being the icon's own opacity (0 to 255), the layer's left aside.
export function shownIcons(fake) {
    const layer = statusIconsLayer(fake);
    if (!layer) return [];
    const icons = new Map();
    for (const stroke of layer.strokes()) {
        if (!("fill" in stroke)) continue;
        const icon = ICON_OF_COLOR[(stroke.fill >>> 0) & 0xFFFFFF];
        if (!icon) continue;
        const { x, y, height } = stroke.rect;
        const seen = icons.get(icon) || { icon, left: x, top: y, bottom: y + height, alpha: 0 };
        seen.left = Math.min(seen.left, x);
        seen.top = Math.min(seen.top, y);
        seen.bottom = Math.max(seen.bottom, y + height);
        seen.alpha = Math.max(seen.alpha, (stroke.fill >>> 24) & 0xFF);
        icons.set(icon, seen);
    }
    return [...icons.values()].sort((a, b) => a.left - b.left);
}

export const shownIconNames = fake => shownIcons(fake).map(({ icon }) => icon);

// The first icon's square: 14 px right of the widest time the clock can
// show, its text starting 30 px from the left, 7 px a character on the fake host.
const slotLeftOf = lang =>
    30 + Math.max(...Array.from({ length: 24 }, (_, hours) => lang.clock.time(hours, 0).length)) * 7 + 14;

// Whether the first icon is in the slot: a glyph's first filled pixel sits
// a few pixels inside its square.
export function assertInSlot(fake, lang, message) {
    const offset = shownIcons(fake)[0].left - slotLeftOf(lang);
    assert.ok(offset >= 0 && offset <= 3, `${message} (${offset} px from the slot)`);
}
