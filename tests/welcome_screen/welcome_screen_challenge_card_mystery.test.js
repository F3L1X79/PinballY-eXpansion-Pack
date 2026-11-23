// ============================================================
// Welcome Screen "?" card: a Challenge under way without tables to offer
// shows a gold "?" tile, its title, its progress and the any-table line;
// its Go button launches a Random Game, counted as one, with the Add-on off.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import config from "../../common/core/config.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import {
    cardTexts, cardFills, periodColors, periodCardLogos, periodCardLogoHeights, readChoices, choose, isWelcomeScreenOpen, goButtons, cardHighlightParts,
} from "./welcome_screen_reader.js";
import { startWithChallenge, playFor, countedGame, ALICE_FILE, WEEK, STERN_A, TABLES } from "./challenge_card_scenario.js";

test("a Challenge without tables shows a ? card that launches a Random Game", async () => {
    config.skipRandomGameAnimation = true;
    const fake = await startWithChallenge({
        challenge: { week: WEEK, template: "differentManufacturers", param: null, target: 3 },
        games: [countedGame(STERN_A)],
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const CARDS = lang.welcomeScreen.periodCards;

    const texts = cardTexts(fake);
    assert.equal(texts.length, 3);
    assert.deepEqual(texts[2], [
        "A CHALLENGE TABLE", "Play tables from 3 different manufacturers", "1/3 · 5 days left", "Any table: a random game",
    ]);
    assert.equal(periodColors(fake)[2], STEAMBALL_COLORS.challengeAccent, "the period in the Challenge's green");
    assert.ok(cardFills(fake)[2].includes(STEAMBALL_COLORS.challengeAccent), "the progress bar in the Challenge's colour");
    assert.equal(periodCardLogos(fake)[2], "?");
    assert.ok(periodCardLogoHeights(fake)[2] <= 96, "the ? tile about a wheel logo's height");
    assert.equal(readChoices(fake).filter(name => name === CARDS.challenge.period).length, 1);
    assert.deepEqual(goButtons(fake), [CARDS.go, CARDS.go, CARDS.go], "three stacked cards, the ? card's with its Go button too");
    assert.deepEqual(cardHighlightParts(fake), ["button", "button", "button"]);

    choose(fake, CARDS.challenge.period);
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    const [launched] = fake.launches();
    assert.ok(launched, "a Random Game is launched");
    playFor(fake, TABLES.find(game => game.configId === launched.configId), 120);
    const saved = JSON.parse(fake.readFile(ALICE_FILE));
    assert.equal(saved.randomGames, 1);
    assertNoErrorLogged(fake);
});
