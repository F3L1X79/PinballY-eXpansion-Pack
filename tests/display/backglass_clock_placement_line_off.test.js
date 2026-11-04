// ============================================================
// Backglass Clock Placement, through main.js on the fake PinballY globals:
// no line while the clock isn't running, whether it is off or saved on but
// PinballY not restarted yet, since no window exists to place.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startPlacement, openCategory, leaveSettings, ENV_LOCAL, PLACEMENT_LINE } from "./backglass_clock_placement_scenario.js";

test("no placement line with the clock saved on but PinballY not restarted, nor with it off", async () => {
    const fake = await startPlacement({ clockRunning: false, savedClockOn: true });

    const savedOn = openCategory(fake);
    assert.ok(savedOn.includes("Backglass Clock: On (on restart)"));
    assert.ok(!savedOn.includes(PLACEMENT_LINE));

    leaveSettings(fake);
    fake.addFile(ENV_LOCAL, "ADD_ON_BACKGLASS_CLOCK=false\n");
    const off = openCategory(fake);
    assert.ok(off.includes("Backglass Clock: Off"));
    assert.ok(!off.includes(PLACEMENT_LINE));
    assertNoErrorLogged(fake);
});
