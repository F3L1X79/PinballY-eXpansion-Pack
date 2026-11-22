// ============================================================
// Welcome Screen Challenge Table card: with the offered Table of the Week
// as the only Challenge Table left, the card still shows, offering it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { periodCards } from "./welcome_screen_reader.js";
import { startWithChallenge, playedOnce, WEEK, DAY_TABLE, STERN_A, STERN_B, STERN_C } from "./challenge_card_scenario.js";

test("the Challenge Table card offers the Table of the Week when it is the only Challenge Table left", async () => {
    // Only Twilight Zone was never played.
    const fake = await startWithChallenge({
        challenge: { week: WEEK, template: "neverPlayedTables", param: null, target: 3 },
        plays: playedOnce([DAY_TABLE, STERN_A, STERN_B, STERN_C]),
    });

    assert.deepEqual(periodCards(fake).map(card => card.name), ["Medieval Madness", "Twilight Zone", "Twilight Zone"]);
    assertNoErrorLogged(fake);
});
