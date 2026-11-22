// ============================================================
// Welcome Screen Challenge Table card with a "N games on the Table of the
// Week" Challenge before its last step: the card shows while the Challenge
// is under way, offering the Table of the Week with the progress.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { periodCards } from "./welcome_screen_reader.js";
import { startWithChallenge, countedGame, WEEK, WEEK_TABLE } from "./challenge_card_scenario.js";

test("a Table of the Week Challenge before its last step offers the Table of the Week on the Challenge Table card", async () => {
    // 2 of 5 games.
    const fake = await startWithChallenge({
        challenge: { week: WEEK, template: "tableOfTheWeekGames", param: null, target: 5 },
        games: [1, 2].map(() => ({ ...countedGame(WEEK_TABLE), isTableOfTheWeek: true })),
    });

    const cards = periodCards(fake);
    assert.equal(cards.length, 3);
    assert.equal(cards[2].name, "Twilight Zone");
    assert.equal(cards[2].line, "Play 5 games on the Table of the Week · 2/5");
    assertNoErrorLogged(fake);
});
