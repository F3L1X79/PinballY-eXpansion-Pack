// ============================================================
// The Household Rating across Change Player, through main.js on the fake
// PinballY globals: the same value whichever Profile is active, until a
// Rating changes; a Rating given while another Profile was active counts
// once that Profile is left.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, lastLowerMessage, rate, switchTo, MEDIEVAL, MEDIEVAL_POSITION } from "./household_rating_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("Change Player leaves the Household Rating unchanged unless a Rating changed", async () => {
    const { fake, TEXT } = await startScenario({
        ratings: { Alice: { [MEDIEVAL.configId]: 4 }, Bob: { [MEDIEVAL.configId]: 2 }, Carol: {} },
        active: "Alice",
    });
    const household = (rating, count) => TEXT.householdRating(MEDIEVAL_POSITION, rating, count);
    assert.equal(lastLowerMessage(fake), household(3, 2));

    await switchTo("Bob");
    assert.equal(lastLowerMessage(fake), household(3, 2), "the same with Bob active");
    await rate(fake, MEDIEVAL, 5);
    assert.equal(lastLowerMessage(fake), household(4.5, 2), "Bob's new Rating");

    await switchTo("Carol");
    assert.equal(lastLowerMessage(fake), household(4.5, 2), "Bob's new Rating, read back from his file");
    await switchTo("Alice");
    assert.equal(lastLowerMessage(fake), household(4.5, 2));
    assertNoErrorLogged(fake);
});
