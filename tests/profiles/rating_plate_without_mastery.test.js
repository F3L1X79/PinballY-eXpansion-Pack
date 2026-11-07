// ============================================================
// With Table Mastery off, the Rating Plate takes the Mastery Bar's place,
// through main.js on the fake PinballY globals: right under the Profile
// badge when there is no Challenge Card either.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownTop, shownRating, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const BADGE = 170;
const [MEDIEVAL] = TABLES;

test("the Rating Plate takes the Mastery Bar's place with Table Mastery off", async () => {
    const fake = await startScenario({
        addOns: ["profilePicker", "profileRatings"], ratings: { Alice: { [MEDIEVAL.configId]: 2.5 } }, active: "Alice",
    });
    assert.equal(shownRating(fake), 2.5);
    assert.equal(shownTop(fake), BADGE);
    assertNoErrorLogged(fake);
});
