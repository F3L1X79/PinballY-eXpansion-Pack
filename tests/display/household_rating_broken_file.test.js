// ============================================================
// A Profile whose Ratings file cannot be read, through main.js on the fake
// PinballY globals: the store sets it aside and logs it, that Profile is
// left out of the Household Rating, and startup goes on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, lastLowerMessage, MEDIEVAL, MEDIEVAL_POSITION } from "./household_rating_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("an unreadable Ratings file leaves its Profile out of the Household Rating", async () => {
    const { fake, TEXT } = await startScenario({
        ratings: { Alice: { [MEDIEVAL.configId]: 4 }, Bob: {}, Carol: { [MEDIEVAL.configId]: 3 } },
        active: "Alice",
        files: { "Bob\\ratings.json": "{ broken" },
    });

    assert.equal(lastLowerMessage(fake), TEXT.householdRating(MEDIEVAL_POSITION, 3.5, 2), "Alice's and Carol's only");
    const errorLog = fake.readFile("C:\\PinballY\\Scripts\\ExpansionPack\\logs\\errors.log");
    assert.match(errorLog, /Bob\\ratings\.json and its backup are unreadable; kept aside/);
    assertNoErrorLogged(fake);
});
