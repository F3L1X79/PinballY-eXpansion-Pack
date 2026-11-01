// ============================================================
// Clock: the time at the top left of the wheel screen, facing the active
// Profile's badge, in the language's format, soft white with a drop shadow
// and a gold underline as wide as the time. Redrawn when the minute
// changes; hidden on "gamestarted", shown again (on time) on "wheelmode".
// ============================================================

import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { drawShadowedText } from "../common/drawing/shadowed_text.js";
import { CLOCK_COLORS, clockTextOf, createMinuteTick } from "../common/clock/minute_tick.js";
import { WHEEL_CLOCK, TIME_TEXT } from "../common/clock/wheel_clock_layout.js";

const SCRIPT_NAME = "Clock";

const UNDERLINE = Object.freeze({ thickness: 2, gap: 4 });
// Opaque: a translucent text would show its own shadow through it.
const COLORS = Object.freeze({ ...CLOCK_COLORS, transparent: 0x00000000 });

export default function init() {
    const host = createPinballYHost();
    const layer = host.createDrawingLayer(WHEEL_CLOCK.zIndex);
    layer.setScale({ ySpan: WHEEL_CLOCK.height / WHEEL_CLOCK.referenceHeight });
    layer.setPos(0, 0, "top left");

    function draw() {
        const now = host.now();
        layer.clear(COLORS.transparent);
        layer.draw(dc => {
            const { left, top, width } = WHEEL_CLOCK;
            const text = clockTextOf(now);
            const measured = drawShadowedText(host, dc, TIME_TEXT, COLORS.text, text, top,
                { x: left, width: width - left, align: "left" });
            const underlineY = top + measured.height + UNDERLINE.gap;
            dc.fillRect(left, underlineY, Math.round(measured.width), UNDERLINE.thickness, COLORS.gold);
        }, WHEEL_CLOCK.width, WHEEL_CLOCK.height);
    }

    const minuteTick = createMinuteTick(host, SCRIPT_NAME, draw);

    // Never over a game, and no redraw while it is hidden.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        layer.alpha = 0;
        minuteTick.stop();
    }));
    // Fires back on the wheel, after a game, a menu or a dialog: PinballY
    // may not have run timers while the game had the screen.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        layer.alpha = 1;
        minuteTick.start();
    }));

    minuteTick.start();
}
