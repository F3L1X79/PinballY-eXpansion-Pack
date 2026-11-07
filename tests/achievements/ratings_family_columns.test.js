// ============================================================
// The Ratings family counts the file and PinballY's rating column together,
// through main.js on the fake PinballY globals: Guest's Ratings of tables
// gone from the game list plus the Ratings just given in the dialog, a
// Rating of 0 included, unlock the next step at the next game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startRatingsScenario, MEDIEVAL, MARS, GONE_TABLES } from "./ratings_family_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("Ratings in the file for gone tables and on the columns add up, a Rating of 0 counting", async () => {
    const { fake, titles, familyToasts, newToastTexts, rate, play } = await startRatingsScenario({
        ratings: { guest: { [GONE_TABLES[0]]: 3, [GONE_TABLES[1]]: 1, [GONE_TABLES[2]]: 4.5 } },
    });
    const [firstVerdict, armchairCritic] = titles;
    assert.deepEqual(familyToasts(await newToastTexts()), [firstVerdict], "Guest has the family");

    rate(MEDIEVAL, 0);
    await play();
    assert.deepEqual(familyToasts(await newToastTexts()), [], "four tables rated");

    rate(MARS, 2);
    await play();
    assert.deepEqual(familyToasts(await newToastTexts()), [armchairCritic], "the fifth, never written to the file yet");
    assertNoErrorLogged(fake);
});
