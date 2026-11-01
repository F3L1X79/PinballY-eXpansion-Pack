// ============================================================
// Backglass Clock when a capture is only known at "gamestarted" (a batch
// capture's launch command isn't documented), through main.js on the fake
// PinballY globals: shown at "prelaunch", hidden at once at "gamestarted".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };

test("a capture seen only at gamestarted hides the Backglass Clock before recording", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 30, 21, 47, 30), tables: [TABLE], monitorCount: 2 });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();
    fake.playGame(TABLE);
    fake.gameStarted(TABLE, { capture: "batch" });
    assert.equal(clock.isVisible(), false, "hidden at gamestarted");
    const afterStart = clock.calls().length;
    fake.advanceTime(3 * 60 * 1000);
    assert.equal(clock.calls().length, afterStart, "never raised during the capture");
    fake.gameOver(TABLE);
    await settle();

    assert.equal(clock.isVisible(), false);
    assert.ok(!fake.shownMenus().some(menu => menu.id === "pause game"));
    assertNoErrorLogged(fake);
});
