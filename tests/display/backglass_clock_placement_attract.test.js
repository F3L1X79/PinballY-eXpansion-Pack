// ============================================================
// Backglass Clock Placement, through main.js on the fake PinballY globals:
// attract mode closes the Dialog, which ends the placement as Done would, so
// the clock never stays on the backglass screen with its borders.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { isDrawnMenuShown } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startPlacement, openCategory, openPlacement, assertPlacementEnded } from "./backglass_clock_placement_scenario.js";

test("attract mode during the placement ends it", async () => {
    const fake = await startPlacement();
    const [clock] = fake.mediaWindows();
    openCategory(fake);
    openPlacement(fake);
    assert.equal(clock.isVisible(), true);

    fake.enterAttractMode();

    assert.ok(!isDrawnMenuShown(fake), "the Dialog closed");
    assertPlacementEnded(fake, clock);
    assertNoErrorLogged(fake);
});
