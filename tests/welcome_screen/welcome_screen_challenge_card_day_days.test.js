// ============================================================
// Welcome Screen Challenge Table card with a "Table of the Day on N days"
// Challenge before its last step: the card shows while the Challenge is
// under way, offering the Table of the Day with the progress.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { periodCards } from "./welcome_screen_reader.js";
import { startWithChallenge, countedGame, WEEK, DAY_TABLE } from "./challenge_card_scenario.js";

test("a Table of the Day Challenge before its last step offers the Table of the Day on the Challenge Table card", async () => {
    // 1 of 3 days.
    const fake = await startWithChallenge({
        challenge: { week: WEEK, template: "tableOfTheDayDays", param: null, target: 3 },
        games: [{ ...countedGame(DAY_TABLE), isTableOfTheDay: true, day: "2026-09-21" }],
    });

    const cards = periodCards(fake);
    assert.equal(cards.length, 3);
    assert.equal(cards[2].name, "Medieval Madness");
    assert.equal(cards[2].line, "Play the Table of the Day on 3 different days · 1/3");
    assertNoErrorLogged(fake);
});
