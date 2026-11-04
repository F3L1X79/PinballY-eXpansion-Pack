// ============================================================
// Backglass Clock Position, through main.js on the fake PinballY globals: a
// bottom place stays entirely on the screen when the window comes out 200 px
// tall, even at a game where its borders came back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
// 1280x1024, left of the playfield and lower. Margin: 30 x 1024 / 1920 = 16.
const BACKGLASS_RECT = { left: -1280, top: 100, right: 0, bottom: 1124 };
// Centred: -1280 + (1280 - 320) / 2. Top: 1124 - 200 - 16.
const EXPECTED_RECT = { left: -800, top: 908, right: -480, bottom: 1108 };
const SWP_NOMOVE = 0x2;
const SWP_NOACTIVATE = 0x10;

test("a bottom Backglass Clock Position keeps the 200 px tall window on the screen", async () => {
    const fake = createFakePinballYHost({ tables: [TABLE], monitorCount: 2, backglassWindowRect: BACKGLASS_RECT });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";
    config.backglassClockPosition = "bottomCenter";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();

    fake.playGame(TABLE);
    assert.deepEqual(clock.windowRect(), EXPECTED_RECT);
    const shownAt = clock.calls().findIndex(entry => entry.call === "showWindow" && entry.visible);
    const lastMoveAt = clock.calls().findLastIndex(entry => entry.call === "setWindowPos" && !(entry.flags & SWP_NOMOVE));
    assert.ok(lastMoveAt >= 0 && lastMoveAt < shownAt, "placed before it shows");
    assert.ok(clock.calls().filter(entry => entry.call === "setWindowPos").every(entry => entry.flags & SWP_NOACTIVATE), "never takes the focus");
    fake.gameStarted(TABLE);
    fake.gameOver(TABLE);

    clock.showBorders();
    fake.playGame(TABLE);
    assert.deepEqual(clock.windowRect(), EXPECTED_RECT, "the same place with its borders back");
    assertNoErrorLogged(fake);
});
