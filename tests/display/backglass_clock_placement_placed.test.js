// ============================================================
// Backglass Clock Placement, through main.js on the fake PinballY globals: a
// clock the owner already placed on the backglass screen starts from there,
// and the placement never moves it, Done included.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startPlacement, openCategory, openPlacement, OWNER_PLACE } from "./backglass_clock_placement_scenario.js";

test("a placed clock starts where it is and stays there", async () => {
    const fake = await startPlacement({ ownerPlace: OWNER_PLACE });
    const [clock] = fake.mediaWindows();
    openCategory(fake);

    openPlacement(fake);
    assert.equal(clock.isVisible(), true);
    assert.deepEqual(clock.windowRect(), OWNER_PLACE);

    chooseEntry(fake, "Done");
    assert.deepEqual(clock.windowRect(), OWNER_PLACE);
    assertNoErrorLogged(fake);
});
