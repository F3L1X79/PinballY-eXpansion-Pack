// ============================================================
// Status Line Info off, through main.js on the fake PinballY globals: the
// lower status line stays PinballY's own, with no Household Rating, and
// the Rating Plate still shows the active Profile's Rating.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, MEDIEVAL } from "./household_rating_scenario.js";
import { shownRating } from "../profiles/rating_plate_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { DRAWN_AHEAD_MS } from "../profiles/rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with Status Line Info off, no Household Rating but the Rating Plate still shows", async () => {
    const { fake } = await startScenario({
        ratings: { Alice: { [MEDIEVAL.configId]: 4 }, Bob: { [MEDIEVAL.configId]: 2 } },
        active: "Alice",
        addOns: ["profileRatings", "profilePicker"],
    });
    fake.advanceTime(DRAWN_AHEAD_MS);
    await settle();

    assert.deepEqual(fake.lowerStatusLine(), []);
    assert.equal(shownRating(fake), 4);
    assertNoErrorLogged(fake);
});
