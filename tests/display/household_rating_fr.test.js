// ============================================================
// The Household Rating message in French, through main.js on the fake
// PinballY globals: a decimal comma, "avis" for the count, and the
// active Profile's own Rating the same way.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, lastLowerMessage, select, MEDIEVAL, MARS, TABLES } from "./household_rating_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const THEATRE = TABLES[2];

test("the Household Rating reads in French with a decimal comma", async () => {
    const { fake } = await startScenario({
        ratings: { Alice: { [MEDIEVAL.configId]: 4, [MARS.configId]: 2.5 }, Bob: { [MEDIEVAL.configId]: 3 } },
        active: "Alice",
        language: "fr",
    });

    assert.equal(lastLowerMessage(fake), "Table 2/[Filter.Count] - note de la maison : 3,5 sur 5 (2 avis).");
    select(fake, MARS);
    assert.equal(lastLowerMessage(fake), "Table 1/[Filter.Count] - votre note : 2,5 sur 5.");
    select(fake, THEATRE);
    assert.equal(lastLowerMessage(fake), "Table 3/[Filter.Count] - aucune note pour cette table.");
    assertNoErrorLogged(fake);
});
