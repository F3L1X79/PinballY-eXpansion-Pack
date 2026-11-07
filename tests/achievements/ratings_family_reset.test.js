// ============================================================
// The Ratings family after a Profile Reset, through main.js on the fake
// PinballY globals: the reset keeps the Ratings, so the steps announced at
// startup are announced again at the next game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startRatingsScenario, MEDIEVAL, MARS, THEATRE, GONE_TABLES } from "./ratings_family_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("after a Profile Reset, the Ratings steps are announced again", async () => {
    const { fake, store, titles, familyToasts, newToastTexts, play } = await startRatingsScenario({
        active: "Alice",
        ratings: { Alice: { [MEDIEVAL.configId]: 4, [MARS.configId]: 3, [THEATRE.configId]: 2, [GONE_TABLES[0]]: 3, [GONE_TABLES[1]]: 5 } },
    });
    const [firstVerdict, armchairCritic] = titles;
    assert.deepEqual(familyToasts(await newToastTexts()), [firstVerdict, armchairCritic]);

    store.resetProfile("Alice");
    await play();
    assert.deepEqual(familyToasts(await newToastTexts()), [firstVerdict, armchairCritic]);
    assertNoErrorLogged(fake);
});
