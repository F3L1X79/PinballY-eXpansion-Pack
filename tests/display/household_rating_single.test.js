// ============================================================
// Under two Household Ratings, through main.js on the fake PinballY globals:
// a single Rating from another Profile shows "no rating for this table",
// never that Profile's value; the active Profile's own Rating shows as
// PinballY holds it, half stars included, Guest's too.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, lastLowerMessage, select, MEDIEVAL, MARS, TABLES, MEDIEVAL_POSITION } from "./household_rating_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const THEATRE = TABLES[2];

test("a table rated by fewer than two Profiles of the Household has no Household Rating", async () => {
    const { fake, TEXT } = await startScenario({
        ratings: {
            guest: { [MARS.configId]: 4.5, [THEATRE.configId]: 1 },
            Alice: { [MEDIEVAL.configId]: 5 },
            Bob: {},
        },
        active: "guest",
    });

    assert.equal(lastLowerMessage(fake), TEXT.noRating(MEDIEVAL_POSITION), "only Alice rated it, Guest is active");
    select(fake, MARS);
    assert.equal(lastLowerMessage(fake), TEXT.yourRating(1, 4.5), "Guest's own Rating, half star included");
    select(fake, THEATRE);
    assert.equal(lastLowerMessage(fake), TEXT.yourRating(3, 1));
    assertNoErrorLogged(fake);
});
