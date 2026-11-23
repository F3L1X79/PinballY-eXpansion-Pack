// ============================================================
// Welcome Screen with four cards: the Period cards on top, the Challenge
// and Household Challenge cards below, in a 2 x 2 grid read row by row; the
// two challenge cards never offer the same table while another is left.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { periodCards, cardRects, readChoices } from "./welcome_screen_reader.js";
import { startWithChallenge, householdGame, countedGame, STERN_CHALLENGE, WEEK, STERN_A, STERN_B, STERN_C } from "./challenge_card_scenario.js";

const WINDOW = { width: 1920, height: 1080 };

test("four cards make a 2 x 2 grid, each challenge card with its own table", async t => {
    // The first candidate: Deadpool for both, were the Challenge's not offered already.
    t.mock.method(Math, "random", () => 0);
    const fake = await startWithChallenge({
        challenge: STERN_CHALLENGE,
        games: [countedGame(STERN_A)],
        household: { week: WEEK, template: "manufacturerTables", param: "Stern", target: 3, games: [householdGame("Alice", STERN_A)] },
        addOns: ["startupChoicePrompt", "profilePicker", "challenges", "householdChallenge"],
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const CARDS = lang.welcomeScreen.periodCards;

    const rects = cardRects(fake, WINDOW);
    assert.deepEqual(rects.map(rect => rect.period), [CARDS.day.period, CARDS.week.period, CARDS.challenge.period, CARDS.household.period]);
    const [day, week, challenge, household] = rects;
    assert.ok(Math.abs(day.top - week.top) < 1 && week.left > day.right, "Day and Week side by side");
    assert.ok(Math.abs(challenge.top - household.top) < 1 && household.left > challenge.right, "both challenges side by side");
    assert.ok(challenge.top > day.bottom, "the challenges under the Period cards");
    assert.ok(Math.abs(challenge.left - day.left) < 1 && Math.abs(household.right - week.right) < 1, "the grid's columns line up");

    const names = periodCards(fake).filter(card => [CARDS.challenge.period, CARDS.household.period].includes(card.period)).map(card => card.name);
    assert.deepEqual([...names].sort(), [STERN_B.title, STERN_C.title].sort(), "two different tables");

    const choices = readChoices(fake);
    const cardChoices = choices.filter(name => Object.values(CARDS).some(card => card.period === name));
    assert.deepEqual(cardChoices, [CARDS.day.period, CARDS.week.period, CARDS.challenge.period, CARDS.household.period], "the flippers' loop in reading order");
    assertNoErrorLogged(fake);
});
