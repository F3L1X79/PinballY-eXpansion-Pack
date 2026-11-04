// ============================================================
// Backglass Clock Placement, through main.js on the fake PinballY globals:
// its line sits right under the clock's own while the clock runs on more
// than one monitor, the monitors counted at each opening.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startPlacement, openCategory, leaveSettings, PLACEMENT_LINE } from "./backglass_clock_placement_scenario.js";

test("the placement line shows under the clock's line with two monitors, and goes with the second one", async () => {
    const fake = await startPlacement();

    const lines = openCategory(fake);
    assert.equal(lines[lines.indexOf("Backglass Clock: On") + 1], PLACEMENT_LINE);

    leaveSettings(fake);
    fake.setMonitorCount(1);
    const onOneScreen = openCategory(fake);
    assert.ok(onOneScreen.includes("Backglass Clock: On"));
    assert.ok(!onOneScreen.includes(PLACEMENT_LINE));
    assertNoErrorLogged(fake);
});
