// ============================================================
// Force Backglass on a cabinet, through main.js on the fake PinballY
// globals: with a monitor for the backglass, the Add-on shows the
// backglass window at startup, hides it while a table runs without saving
// it hidden, and shows it again after the game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };

test("on two screens the backglass shows at startup, hides during a game and comes back after it", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 29, 10, 0, 0), tables: [TABLE], monitorCount: 2 });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "forceBackglass";

    await import("../../main.js");
    await settle();
    assert.deepEqual(fake.backglassShowCalls(), [true], "shown at startup");
    fake.gameStarted(TABLE);
    assert.deepEqual(fake.backglassShowCalls(), [true, false], "hidden while the table runs");
    assert.equal(fake.settings.getBool("BackglassWindow.Visible", true), true,
        "never saved hidden: PinballY switched off mid-game still opens it, and shows it itself after the game");
    fake.gameOver(TABLE);
    assert.deepEqual(fake.backglassShowCalls(), [true, false, true], "shown again after the game");

    assertNoErrorLogged(fake);
});
