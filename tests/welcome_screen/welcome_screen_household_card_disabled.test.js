// ============================================================
// Welcome Screen with the Household Challenge Add-on off: no Household
// Challenge card, even with a week's Household Challenge locked.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { periodCards } from "./welcome_screen_reader.js";
import { startWithChallenge, householdGame, WEEK, STERN_A } from "./challenge_card_scenario.js";

test("no Household Challenge card with its Add-on off", async () => {
    const fake = await startWithChallenge({
        household: { week: WEEK, template: "manufacturerTables", param: "Stern", target: 3, games: [householdGame("Alice", STERN_A)] },
        addOns: ["startupChoicePrompt", "profilePicker", "challenges"],
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const CARDS = lang.welcomeScreen.periodCards;

    assert.deepEqual(periodCards(fake).map(card => card.period), [CARDS.day.period, CARDS.week.period, CARDS.challenge.period]);
    assertNoErrorLogged(fake);
});
