// ============================================================
// The Household Rating right after Profile Ratings' first run, through
// main.js on the fake PinballY globals: the cabinet's Ratings, just copied
// into every Profile, already count for each of them but Guest.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, lastLowerMessage, MEDIEVAL, MEDIEVAL_POSITION } from "./household_rating_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the first run's copied Ratings give a Household Rating at once", async () => {
    const { fake, TEXT } = await startScenario({
        ratings: { guest: {}, Alice: { [MEDIEVAL.configId]: 4 }, Bob: {}, Carol: {} },
        active: "Alice",
        firstRun: true,
    });

    assert.equal(lastLowerMessage(fake), TEXT.householdRating(MEDIEVAL_POSITION, 4, 3));
    assertNoErrorLogged(fake);
});
