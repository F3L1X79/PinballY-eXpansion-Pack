// ============================================================
// Welcome Screen Household Challenge card: under way, with the Challenges
// off, it offers one of the active Profile's Household Challenge Tables after
// the Period cards, its period in the house's pink; its Go button launches it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { periodCards, periodColors, readChoices, choose, isWelcomeScreenOpen, goButtons, cardHighlightParts } from "./welcome_screen_reader.js";
import { startWithChallenge, householdGame, WEEK, STERN_A, STERN_B, STERN_C } from "./challenge_card_scenario.js";

test("the Household Challenge card offers a table that moves it forward", async () => {
    const fake = await startWithChallenge({
        household: { week: WEEK, template: "manufacturerTables", param: "Stern", target: 3, games: [householdGame("Alice", STERN_A)] },
        addOns: ["startupChoicePrompt", "profilePicker", "householdChallenge"],
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const CARDS = lang.welcomeScreen.periodCards;

    const cards = periodCards(fake);
    assert.deepEqual(cards.map(card => card.period), [CARDS.day.period, CARDS.week.period, "HOUSEHOLD CHALLENGE"]);
    const household = cards[2];
    assert.ok([STERN_B.title, STERN_C.title].includes(household.name), "a Stern table Alice has not counted yet");
    assert.equal(household.line, "Play 3 different Stern tables · 1/3");
    assert.equal(periodColors(fake)[2], STEAMBALL_COLORS.householdAccent, "the period in the house's pink");
    assert.ok(readChoices(fake).includes("HOUSEHOLD CHALLENGE"));
    assert.equal(goButtons(fake)[2], CARDS.go);
    assert.equal(cardHighlightParts(fake)[2], "button");

    choose(fake, "HOUSEHOLD CHALLENGE");
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.deepEqual(fake.launches().map(game => game.title), [household.name]);
    assertNoErrorLogged(fake);
});
