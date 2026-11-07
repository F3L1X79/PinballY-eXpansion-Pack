// ============================================================
// Without the Profile Picker, the Rating Plate moves up with the Mastery
// Bar, through main.js on the fake PinballY globals: the bar at the top
// of the window, the plate right under it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownTop, shownRating, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const MASTERY_BAR = 96;
const [MEDIEVAL] = TABLES;

test("the Rating Plate sits under the Mastery Bar at the top without the Profile Picker", async () => {
    const fake = await startScenario({ addOns: ["tableMastery", "profileRatings"], ratings: { guest: { [MEDIEVAL.configId]: 5 } } });
    assert.equal(shownRating(fake), 5);
    assert.equal(shownTop(fake), MASTERY_BAR);
    assertNoErrorLogged(fake);
});
