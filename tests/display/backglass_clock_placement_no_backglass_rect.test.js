// ============================================================
// Backglass Clock Placement, through main.js on the fake PinballY globals: a
// backglass screen that can't be read leaves the clock where it is, with one
// log line and no error; the placement still opens.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startPlacement, openCategory, openPlacement } from "./backglass_clock_placement_scenario.js";

test("with the backglass screen unknown the placement opens with the clock where it is", async () => {
    const fake = await startPlacement({ backglassWindowRect: null });
    const [clock] = fake.mediaWindows();
    const before = clock.windowRect();
    openCategory(fake);

    openPlacement(fake);

    assert.equal(clock.isVisible(), true);
    assert.deepEqual(clock.windowRect(), before);
    assert.equal(fake.logLines().filter(line => line.includes("[BackglassClock] Backglass screen unknown")).length, 1);
    assertNoErrorLogged(fake);
});
