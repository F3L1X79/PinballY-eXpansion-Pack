// ============================================================
// The Rating Plate shows the active Profile's Rating of the selected
// table, through main.js on the fake PinballY globals: whole and half
// stars, five empty stars for a zero, no plate on an unrated table or an
// empty wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownRating, select, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const [MEDIEVAL, MARS, THEATRE, TWILIGHT] = TABLES;

test("the Rating Plate shows the selected table's Rating, half stars included, and nothing unrated", async () => {
    const fake = await startScenario({
        ratings: { guest: { [MEDIEVAL.configId]: 4, [MARS.configId]: 3.5, [THEATRE.configId]: 0 } },
    });
    assert.equal(shownRating(fake), 4, "the table selected at startup");

    select(fake, MARS);
    assert.equal(shownRating(fake), 3.5, "a half star");
    select(fake, THEATRE);
    assert.equal(shownRating(fake), 0, "five empty stars for a zero");
    select(fake, TWILIGHT);
    assert.equal(shownRating(fake), null, "no plate on an unrated table");
    select(fake, MEDIEVAL);
    assert.equal(shownRating(fake), 4);

    fake.setWheelTables([]);
    fake.moveWheel(0);
    assert.equal(shownRating(fake), null, "no plate on an empty wheel");
    assertNoErrorLogged(fake);
});
