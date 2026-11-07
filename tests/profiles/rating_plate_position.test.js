// ============================================================
// Where the Rating Plate sits, through main.js on the fake PinballY globals
// with the Profile Picker, the Challenges and Table Mastery on: under the
// Mastery Bar, the bar under the badge in a week with no Challenge, then
// both under the card once a new week brings one.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownTop, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const BADGE = 170;
const CARD = 124;
const MASTERY_BAR = 96;
const NO_CHALLENGE = { week: "2026-09-21", template: "", param: null, target: 0 };
const NEXT_MONDAY = new Date(2026, 8, 28, 20, 0, 0);
const [MEDIEVAL] = TABLES;

test("the Rating Plate sits under the Mastery Bar, and moves down with it under a new Challenge Card", async () => {
    const fake = await startScenario({
        addOns: ["profilePicker", "challenges", "tableMastery", "profileRatings"],
        ratings: { Alice: { [MEDIEVAL.configId]: 4 } }, active: "Alice", challenge: NO_CHALLENGE,
    });
    assert.equal(shownTop(fake), BADGE + MASTERY_BAR, "no Challenge Card this week");

    fake.setNow(NEXT_MONDAY);
    fake.fire("wheelmode");
    assert.equal(shownTop(fake), BADGE + CARD + MASTERY_BAR, "under the new week's Challenge Card and the bar");
    assertNoErrorLogged(fake);
});
