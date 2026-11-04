// ============================================================
// Backglass Clock Placement, through main.js on the fake PinballY globals:
// Done and Exit each end it (borderless, hidden, lowered, no timer left) and
// reopen the category on the placement line.
// ============================================================

import { test } from "node:test";
import { chooseEntry, press, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startPlacement, openCategory, openPlacement, assertBackOnPlacementLine, assertPlacementEnded } from "./backglass_clock_placement_scenario.js";

let fake;
let clock;

test("setup", async () => {
    fake = await startPlacement();
    [clock] = fake.mediaWindows();
    openCategory(fake);
});

test("Done ends the placement and comes back on the line", () => {
    openPlacement(fake);
    chooseEntry(fake, "Done");
    fake.advanceTime(OPEN_OVER_MS);

    assertBackOnPlacementLine(fake);
    assertPlacementEnded(fake, clock);
});

test("Exit does the same", () => {
    openPlacement(fake);
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assertBackOnPlacementLine(fake);
    assertPlacementEnded(fake, clock);
    assertNoErrorLogged(fake);
});
