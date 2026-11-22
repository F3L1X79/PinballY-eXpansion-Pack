// ============================================================
// Welcome Screen Challenge Table card: with a Stern Challenge, a third card
// under the Period Table cards shows a drawn Stern table and the progress;
// choosing the card launches it, and the Play is not a Random Game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { periodCards, readChoices, choose, isWelcomeScreenOpen } from "./welcome_screen_reader.js";
import { startWithChallenge, playFor, countedGame, ALICE_FILE, STERN_A, STERN_C } from "./challenge_card_scenario.js";

test("the Welcome Screen offers a Challenge Table, launched by choosing its card and not as a Random Game", async t => {
    // The last of the equal candidates, in collection order.
    t.mock.method(Math, "random", () => 0.99);
    const fake = await startWithChallenge({ games: [countedGame(STERN_A)] });
    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.welcomeScreen;
    const CARDS = TEXT.periodCards;

    const cards = periodCards(fake);
    assert.equal(cards.length, 3);
    assert.deepEqual(cards[2], {
        period: "A CHALLENGE TABLE", name: "Jaws", mastery: lang.tableMastery.toDiscover, line: "Play 3 different Stern tables · 1/3",
    });
    assert.deepEqual(readChoices(fake), [
        lang.profiles.menuEntry, lang.buttonHints.close, CARDS.day.period, CARDS.week.period, "A CHALLENGE TABLE",
        TEXT.randomTable, TEXT.stayOn("Medieval Madness"),
    ]);

    choose(fake, "A CHALLENGE TABLE");
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.deepEqual(fake.launches().map(game => game.configId), [STERN_C.configId]);
    playFor(fake, STERN_C, 120);
    const saved = JSON.parse(fake.readFile(ALICE_FILE));
    assert.equal(saved.randomGames, 0);
    assert.deepEqual(saved.challenge.games.map(game => [game.configId, game.randomGame]), [[STERN_A.configId, false], [STERN_C.configId, false]]);
    assertNoErrorLogged(fake);
});
