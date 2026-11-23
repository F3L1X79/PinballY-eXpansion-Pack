// ============================================================
// Welcome Screen Household Challenge card: once the Household Challenge is
// completed, its card leaves the screen.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { periodCards } from "./welcome_screen_reader.js";
import { startWithChallenge, householdGame, WEEK, STERN_A, STERN_B } from "./challenge_card_scenario.js";

test("a completed Household Challenge has no card", async () => {
    const fake = await startWithChallenge({
        household: {
            week: WEEK, template: "manufacturerTables", param: "Stern", target: 2,
            games: [householdGame("Alice", STERN_A), householdGame("Bob", STERN_B)], toCredit: ["Bob"],
        },
        others: ["Bob"],
        addOns: ["startupChoicePrompt", "profilePicker", "householdChallenge"],
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const CARDS = lang.welcomeScreen.periodCards;

    assert.deepEqual(periodCards(fake).map(card => card.period), [CARDS.day.period, CARDS.week.period]);
    assertNoErrorLogged(fake);
});
