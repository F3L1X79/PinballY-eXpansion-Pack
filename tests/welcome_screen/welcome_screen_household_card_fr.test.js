// ============================================================
// Welcome Screen Household Challenge card in French: "DÉFI DE LA MAISON",
// and "Ont aidé :" before the helpers' Avatars.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { cardTexts } from "./welcome_screen_reader.js";
import { startWithChallenge, householdGame, WEEK, STERN_A } from "./challenge_card_scenario.js";

test("the Household Challenge card in French", async () => {
    const fake = await startWithChallenge({
        household: { week: WEEK, template: "activeDays", param: null, target: 4, games: [householdGame("Bob", STERN_A)] },
        others: ["Bob"],
        addOns: ["startupChoicePrompt", "profilePicker", "householdChallenge"],
        language: "fr",
    });

    const household = cardTexts(fake)[2];
    assert.equal(household[0], "DÉFI DE LA MAISON");
    assert.equal(household[household.length - 1], "Ont aidé :");
    assertNoErrorLogged(fake);
});
