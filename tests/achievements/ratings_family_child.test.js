// ============================================================
// The Ratings family of a Child Profile, through main.js on the fake
// PinballY globals: switched to from Alice, who rated nothing, Bob is
// announced his own five Ratings, an Adult Table's included, read from his
// file while PinballY's columns still hold Alice's.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startRatingsScenario, GONE_TABLES, ADULT_TABLE } from "./ratings_family_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("a Child Profile's Rating of an Adult Table counts, announced at the switch", async () => {
    const { fake, titles, familyToasts, newToastTexts, switchTo } = await startRatingsScenario({
        active: "Alice",
        ratings: {
            Alice: {},
            Bob: { [ADULT_TABLE.configId]: 4, [GONE_TABLES[0]]: 3, [GONE_TABLES[1]]: 2, [GONE_TABLES[2]]: 1, [GONE_TABLES[3]]: 5 },
        },
    });
    const [firstVerdict, armchairCritic] = titles;
    assert.deepEqual(familyToasts(await newToastTexts()), [], "Alice rated nothing");

    await switchTo("Bob");
    assert.deepEqual(familyToasts(await newToastTexts()), [firstVerdict, armchairCritic]);
    assertNoErrorLogged(fake);
});
