// ============================================================
// Welcome Screen with both challenge cards: a Household Challenge with a
// single table keeps it, and the Challenge Table card, which has others,
// offers another one, whichever card comes first.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { periodCards } from "./welcome_screen_reader.js";
import { startWithChallenge, playedOnce, STERN_CHALLENGE, WEEK, DAY_TABLE, WEEK_TABLE, STERN_A, STERN_B, STERN_C } from "./challenge_card_scenario.js";

test("the card with a single table keeps it, the other offers another", async t => {
    // The first candidate: Godzilla for both, were the single table not kept.
    t.mock.method(Math, "random", () => 0);
    // Godzilla is the only table Alice never played.
    const fake = await startWithChallenge({
        challenge: STERN_CHALLENGE,
        household: { week: WEEK, template: "neverPlayedTables", param: null, target: 3 },
        plays: playedOnce([DAY_TABLE, WEEK_TABLE, STERN_B, STERN_C]),
        addOns: ["startupChoicePrompt", "profilePicker", "challenges", "householdChallenge"],
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const CARDS = lang.welcomeScreen.periodCards;

    const nameOf = period => periodCards(fake).find(card => card.period === period).name;
    assert.equal(nameOf(CARDS.household.period), STERN_A.title);
    assert.equal(nameOf(CARDS.challenge.period), STERN_B.title);
    assertNoErrorLogged(fake);
});
