// ============================================================
// Welcome Screen Household Challenge "?" card: without a table to offer it
// shows the "?" tile, the Household Challenge's title and progress in pink,
// no helpers line when the active Profile helped alone, and launches a
// Random Game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import config from "../../common/core/config.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { cardTexts, cardFills, cardImages, periodCardLogos, choose, isWelcomeScreenOpen } from "./welcome_screen_reader.js";
import { startWithChallenge, householdGame, WEEK, STERN_A } from "./challenge_card_scenario.js";

test("a Household Challenge without tables shows a ? card, without helpers when Alice helped alone", async () => {
    config.skipRandomGameAnimation = true;
    const fake = await startWithChallenge({
        household: { week: WEEK, template: "activeDays", param: null, target: 4, games: [householdGame("Alice", STERN_A)] },
        others: ["Bob"],
        addOns: ["startupChoicePrompt", "profilePicker", "householdChallenge"],
    });

    assert.deepEqual(cardTexts(fake)[2], ["HOUSEHOLD CHALLENGE", "Play on 4 different days", "1/4 · 5 days left", "Any table: a random game"]);
    assert.deepEqual(cardImages(fake)[2], [], "no helpers' Avatars");
    assert.ok(cardFills(fake)[2].includes(STEAMBALL_COLORS.householdAccent), "the progress bar in the house's pink");
    assert.equal(periodCardLogos(fake)[2], "?");

    choose(fake, "HOUSEHOLD CHALLENGE");
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.equal(fake.launches().length, 1, "a Random Game is launched");
    assertNoErrorLogged(fake);
});
