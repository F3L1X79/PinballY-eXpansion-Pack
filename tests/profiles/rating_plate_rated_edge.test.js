// ============================================================
// The Rating Plate's yellow top edge, through main.js on the fake PinballY
// globals: on every rated table, 0 stars included, never on an unrated one,
// whether the plate was drawn on demand or ahead.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownRating, shownAsRated, select, TABLES, DRAWN_AHEAD_MS } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const [MEDIEVAL, , THEATRE, TWILIGHT] = TABLES;

test("a yellow edge along the plate's top tells a 0-star Rating from an unrated table", async () => {
    const fake = await startScenario({
        ratings: { guest: { [MEDIEVAL.configId]: 4, [THEATRE.configId]: 0 } },
    });
    assert.equal(shownAsRated(fake), true, "a rated table");
    select(fake, THEATRE);
    assert.equal(shownAsRated(fake), true, "0 stars is still a Rating");
    select(fake, TWILIGHT);
    assert.equal(shownAsRated(fake), false, "no edge on an unrated table");
    assert.equal(shownRating(fake), 0, "its five stars stay empty");

    fake.advanceTime(DRAWN_AHEAD_MS);
    select(fake, THEATRE);
    assert.equal(shownAsRated(fake), true, "drawn ahead, 0 stars");
    select(fake, TWILIGHT);
    assert.equal(shownAsRated(fake), false, "drawn ahead, unrated");
    assertNoErrorLogged(fake);
});
