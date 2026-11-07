// ============================================================
// Backglass Clock off, its default, through main.js on the fake PinballY
// globals: no custom window is created, and a game leaves the wheel's
// windows as they were.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };

test("off by default, the Backglass Clock creates no window", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 30, 21, 47, 30), tables: [TABLE], monitorCount: 2 });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    assert.equal(config.addOns.backglassClock, false, "off by default");
    // Every other default kept, but Table ROMs, which would need vpxtool and the tables' files.
    config.addOns.tableRoms = false;

    await import("../../main.js");
    await settle();
    // The game list's own entry, as PinballY's launch events carry.
    const game = fake.getGameInfo(TABLE.configId);
    fake.playGame(game);
    fake.gameStarted(game);
    fake.advanceTime(60 * 1000);
    fake.gameOver(game);
    await settle();

    assert.deepEqual(fake.mediaWindows(), []);
    assertNoErrorLogged(fake);
});
