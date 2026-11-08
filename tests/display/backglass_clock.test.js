// ============================================================
// Backglass Clock, through main.js on the fake PinballY globals: its own
// borderless window, hidden at startup, shown at "prelaunch" (never during
// the game: that opens the pause menu, #386), raised in front at
// "gamestarted" and every 2 s, the time drawn on a fixed-height canvas,
// then hidden and lowered at "gameover".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
// SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE: never moved, never focused.
const KEEP_PLACE_NO_FOCUS = 0x1 | 0x2 | 0x10;
const PANEL_TOP = 0xFF2A3547;
const PANEL = 0xFF171D27;
const SOFT_WHITE = 0xFFDCDCDC;
const GOLD = 0xFFE8B84A;
const SWP_NOMOVE = 0x2;

test("during a game the Backglass Clock shows the time in front, raised on a schedule, and goes at the end", async () => {
    const fake = createFakePinballYHost({
        now: new Date(2026, 9, 30, 21, 47, 30), tables: [TABLE], monitorCount: 2,
    });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();

    assert.equal(fake.mediaWindows().length, 1, "one custom window, created at init");
    const [clock] = fake.mediaWindows();
    assert.ok(clock.desc.configVarPrefix, "its own settings prefix, so PinballY keeps its place");
    assert.equal(clock.desc.isMediaCapturable, false);
    assert.ok(!("parent" in clock.desc), "the default parent");
    assert.equal(clock.borderlessMode(), true);
    assert.equal(clock.showMediaWhenRunningFlag(), true);
    assert.deepEqual(clock.calls(), [{ call: "showWindow", visible: false }], "hidden at startup");

    clock.showBorders();
    fake.playGame(TABLE);
    assert.equal(clock.isVisible(), true, "shown as the table launches, before the game runs");
    assert.equal(clock.borderlessMode(), true, "borderless again at each game, even if its borders came back");
    const topmostCount = () => clock.calls().filter(entry => entry.after === "TOPMOST").length;
    const beforeStart = topmostCount();
    fake.gameStarted(TABLE);
    assert.ok(!fake.shownMenus().some(menu => menu.id === "pause game"), "never shown during the game, so PinballY opens no pause menu");
    assert.equal(clock.isVisible(), true);
    const raisedAt = topmostCount() > beforeStart ? [0] : [];
    for (let second = 1; second <= 45; second++) {
        const before = topmostCount();
        fake.advanceTime(1000);
        if (topmostCount() > before) raisedAt.push(second);
    }
    assert.deepEqual(raisedAt, Array.from({ length: 23 }, (_, index) => index * 2), "at gamestarted, then every 2 s");

    const [layer] = clock.layers();
    assert.equal(clock.layers().length, 1);
    assert.deepEqual(layer.texts(), [lang.clock.time(21, 48), lang.clock.time(21, 48)], "the time alone with its shadow, redrawn when the minute changed");
    const fills = layer.fills();
    assert.equal(fills[0], GOLD, "a gold frame");
    assert.equal(fills.at(-1), GOLD, "the time underlined in gold");
    assert.equal(fills[1], PANEL_TOP, "the box starts at the Steamball panel's top colour");
    assert.ok(Math.abs((fills.at(-2) & 0xFF) - (PANEL & 0xFF)) <= 1, "and ends at the panel's colour");
    assert.ok(fills.length > 4, "a gradient, in bands");
    const canvas = layer.canvasSize();
    const rects = layer.strokes().filter(stroke => "fill" in stroke).map(stroke => stroke.rect);
    const [frame, firstBand] = rects;
    const lastBand = rects.at(-2);
    const underline = rects.at(-1);
    const box = { x: firstBand.x, y: firstBand.y, width: firstBand.width, height: lastBand.y + lastBand.height - firstBand.y };
    const sides = [box.x - frame.x, box.y - frame.y,
        frame.x + frame.width - box.x - box.width, frame.y + frame.height - box.y - box.height];
    assert.ok(sides.every(side => side === sides[0] && side > 0 && side <= canvas.height / 50), "a thin frame, as thick on all four sides");
    const time = layer.strokes().findLast(stroke => "text" in stroke);
    assert.equal(time.color, SOFT_WHITE);
    assert.ok(time.rect.height < canvas.height / 2, "the time well inside the box");
    assert.ok(underline.y > time.rect.y && underline.width < box.width, "the underline below the time, as wide as it");
    assert.ok(canvas.height < 400, "its own fixed-height canvas, stretched over the window");
    assert.ok(Math.abs(canvas.width / canvas.height - 320 / 200) < 0.02, "as wide as the window's aspect ratio");

    // The window's size changing during the game: the canvas follows its ratio, never its size.
    clock.resize({ width: 640, height: 220 });
    fake.advanceTime(60 * 1000);
    assert.deepEqual(layer.texts(), [lang.clock.time(21, 49), lang.clock.time(21, 49)], "every minute");
    const wide = layer.canvasSize();
    assert.ok(Math.abs(wide.width / wide.height - 640 / 220) < 0.02);
    clock.resize({ width: 320, height: 110 });
    fake.advanceTime(60 * 1000);
    assert.deepEqual(layer.canvasSize(), wide, "the same canvas for the same ratio at another size");
    assert.equal(topmostCount(), beforeStart + 1 + Math.floor((45 + 120) / 2), "still raised every 2 s");

    const beforeEnd = clock.calls().length;
    fake.gameOver(TABLE);
    assert.deepEqual(clock.calls().slice(beforeEnd).map(({ call, visible, after }) => ({ call, visible, after })), [
        { call: "showWindow", visible: false, after: undefined },
        { call: "setWindowPos", visible: undefined, after: "NOTOPMOST" },
    ], "hidden and lowered at gameover");
    fake.advanceTime(10 * 60 * 1000);
    assert.equal(clock.calls().length, beforeEnd + 2, "no raise left after the game");
    assert.deepEqual(layer.texts(), [lang.clock.time(21, 50), lang.clock.time(21, 50)], "no redraw on the wheel");

    const windowCalls = clock.calls().filter(entry => entry.call === "setWindowPos");
    const raises = windowCalls.filter(entry => entry.after === "TOPMOST" || entry.after === "NOTOPMOST");
    assert.ok(raises.every(entry => entry.flags === KEEP_PLACE_NO_FOCUS), "every raise keeps its place and never takes the focus");
    assert.equal(windowCalls.filter(entry => !(entry.flags & SWP_NOMOVE)).length, 1, "moved once, before it shows");
    assertNoErrorLogged(fake);
});
