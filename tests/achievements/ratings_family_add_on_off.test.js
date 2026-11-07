// ============================================================
// The Ratings family follows the Ratings per Profile Add-on, through main.js
// on the fake PinballY globals: with it off, Ratings on PinballY's columns
// unlock nothing, and neither the Achievement set (hence the Player Level)
// nor the Achievement List has the family.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startRatingsScenario, MEDIEVAL, MARS } from "./ratings_family_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with Ratings per Profile off, the Ratings family is absent", async () => {
    const { fake, titles, familyToasts, getAllAchievements, newToastTexts, rate, play, listRows } = await startRatingsScenario({
        addOns: [],
        ratings: { guest: { [MEDIEVAL.configId]: 4 } },
    });
    rate(MARS, 3);
    await play();

    assert.deepEqual(familyToasts(await newToastTexts()), []);
    assert.deepEqual(getAllAchievements().filter(({ id }) => id.startsWith("ratings:")), []);
    assert.deepEqual(listRows().filter(row => titles.includes(row.title)), []);
    assertNoErrorLogged(fake);
});
