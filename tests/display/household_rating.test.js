// ============================================================
// The Household Rating on the lower status line, through main.js on the fake
// PinballY globals: the average of the Household's Ratings rounded to the
// half star, halves up, with their count; the active Profile's and a Child
// Profile's count, Guest's never; a zero is a Rating, PinballY's -1 is not.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, lastLowerMessage, select, MEDIEVAL, MARS, TABLES, MEDIEVAL_POSITION } from "./household_rating_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const THEATRE = TABLES[2];

test("the lower status line ends with the selected table's Household Rating", async () => {
    const { fake, TEXT } = await startScenario({
        ratings: {
            guest: { [MEDIEVAL.configId]: 0, [MARS.configId]: 5 },
            Alice: { [MEDIEVAL.configId]: 4, [MARS.configId]: 2, [THEATRE.configId]: 4 },
            Bob: { [MEDIEVAL.configId]: 3.5, [MARS.configId]: 0, [THEATRE.configId]: -1 },
            Carol: { [MEDIEVAL.configId]: 2, [MARS.configId]: 2 },
            Dan: { [MEDIEVAL.configId]: 4, [MARS.configId]: 5 },
        },
        active: "Alice",
        children: ["Carol"],
    });

    assert.equal(fake.lowerStatusLine().length, 5, "the four table messages, then the Household Rating");
    // (4 + 3.5 + 2 + 4) / 4 = 3.375: Guest's 0 is left out.
    assert.equal(lastLowerMessage(fake), TEXT.householdRating(MEDIEVAL_POSITION, 3.5, 4));

    select(fake, MARS);
    // (2 + 0 + 2 + 5) / 4 = 2.25, halves up; without Bob's zero, 3.
    assert.equal(lastLowerMessage(fake), TEXT.householdRating(1, 2.5, 4));

    select(fake, THEATRE);
    // Bob's -1 is no Rating: only Alice's own is left.
    assert.equal(lastLowerMessage(fake), TEXT.yourRating(3, 4));
    assertNoErrorLogged(fake);
});
