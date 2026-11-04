// ============================================================
// Backglass Clock, through main.js on the fake PinballY globals: a window
// PinballY opened on the playfield screen moves at "prelaunch" to the top
// right of the backglass screen, at its default size, without taking the focus.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
// The backglass screen, right of a 2560-wide playfield.
const BACKGLASS_RECT = { left: 2560, top: 0, right: 4480, bottom: 1080 };
// The wheel Clock's 30 px at 1920 px high, on this 1080 px high screen: 16.875, rounded.
const MARGIN = 17;
const DEFAULT_WIDTH = 320;
const SWP_NOACTIVATE = 0x10;

test("at the first game the Backglass Clock moves onto the backglass screen's top right", async () => {
    const fake = createFakePinballYHost({ tables: [TABLE], monitorCount: 2, backglassWindowRect: BACKGLASS_RECT });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();
    const before = clock.windowRect();
    assert.ok(before.right <= BACKGLASS_RECT.left, "PinballY opens it on the playfield screen");

    fake.playGame(TABLE);
    fake.gameStarted(TABLE);

    const rect = clock.windowRect();
    assert.equal(rect.left, 4143, "screen right - default width - margin");
    assert.equal(rect.right, BACKGLASS_RECT.right - MARGIN);
    assert.equal(rect.top, BACKGLASS_RECT.top + MARGIN);
    const width = rect.right - rect.left;
    assert.equal(width, DEFAULT_WIDTH);
    const height = rect.bottom - rect.top;
    assert.ok(width > height && width <= 400 && height <= 200, `a small box, wider than tall (${width}x${height})`);
    assert.ok(clock.calls().filter(entry => entry.call === "setWindowPos").every(entry => entry.flags & SWP_NOACTIVATE),
        "never takes the focus");
    const canvas = clock.layers()[0].canvasSize();
    assert.ok(Math.abs(canvas.width / canvas.height - width / height) < 0.02, "drawn at the size it moved to");

    fake.gameOver(TABLE);
    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    assert.deepEqual(clock.windowRect(), rect, "the same place at the next game");
    assertNoErrorLogged(fake);
});
