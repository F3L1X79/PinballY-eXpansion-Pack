// ============================================================
// Backglass Clock, through main.js on the fake PinballY globals: with no
// backglass screen to read (a backglass window with no frame), the window
// stays where it is and one line says why, never an error. A game started
// without "prelaunch" gets no clock.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };

test("without the backglass screen's place the Backglass Clock stays where it is and says so once", async () => {
    const fake = createFakePinballYHost({ tables: [TABLE], monitorCount: 2, backglassWindowRect: null });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();
    const before = clock.windowRect();
    const clockLines = () => fake.logLines().filter(line => line.includes("[BackglassClock]"));

    // No "prelaunch": the game started some other way, too late to show it.
    fake.gameStarted(TABLE);
    assert.equal(clock.isVisible(), false, "not shown during the game");
    fake.gameOver(TABLE);

    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    assert.equal(clock.isVisible(), true, "still shown");
    assert.deepEqual(clock.windowRect(), before, "not moved");
    assert.equal(clockLines().length, 1, "one line for this game");
    assert.match(clockLines()[0], /no frame/);
    assertNoErrorLogged(fake);
});
