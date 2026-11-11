// ============================================================
// The Rocket Board through main.js: each finished Rocket Game saved among
// the Profile's five best; the score screen's board, the Household's five
// best (several places for one Profile, the first score first on a tie,
// Guest left out), the line of the game just played highlighted.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startRocketGame, chooseRocketGame, untilCrash, untilScoreScreen, scoreScreenTexts, boardLines, hadTheRocket, profileFile, LEAVING_MS,
} from "./rocket_game_scenario.js";

const savedScores = (fake, name) => JSON.parse(fake.readFile(profileFile(name))).rocketScores;

async function playOneGame(fake, lang) {
    await chooseRocketGame(fake, lang);
    const score = untilCrash(fake, lang);
    untilScoreScreen(fake);
    return score;
}

async function closeScoreScreen(fake) {
    press(fake, "Select");
    await settle();
    fake.advanceTime(LEAVING_MS + 50);
    await settle();
}

test("the score screen shows the Household's five best, the first score first on a tie, Guest left out, the new line highlighted", async () => {
    const guestScores = { ...hadTheRocket, rocketScores: [{ score: 999999, date: "2026-01-01T10:00:00" }] };
    const { fake, lang } = await startRocketGame({ profiles: { guest: guestScores, Alice: hadTheRocket, Bob: {} }, active: "Alice" });

    const firstStart = fake.now();
    const first = await playOneGame(fake, lang);
    assert.ok(first > 1, "a score worth comparing");
    assert.deepEqual(scoreScreenTexts(fake).slice(0, 2), [lang.rocketGame.yourScore, String(first)], "the score just made at the top");
    assert.deepEqual(boardLines(fake), [{ place: "1", name: "Alice", score: String(first), isHighlighted: true }], "Guest left out");
    const [saved] = savedScores(fake, "Alice");
    assert.equal(saved.score, first);
    assert.ok(new Date(saved.date) >= new Date(firstStart.getTime() - 1000), "dated by the game");
    await closeScoreScreen(fake);

    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1, rocketScores: [
        { score: first + 100, date: "2026-11-01T10:00:00" },
        { score: first, date: "2026-11-01T11:00:00" },
        { score: first - 1, date: "2026-11-01T12:00:00" },
        { score: first - 2, date: "2026-11-01T13:00:00" },
    ] }));
    const second = await playOneGame(fake, lang);
    assert.equal(second, first, "the same game, the same score");
    assert.deepEqual(boardLines(fake), [
        { place: "1", name: "Bob", score: String(first + 100), isHighlighted: false },
        { place: "2", name: "Bob", score: String(first), isHighlighted: false },
        { place: "3", name: "Alice", score: String(first), isHighlighted: false },
        { place: "4", name: "Alice", score: String(first), isHighlighted: true },
        { place: "5", name: "Bob", score: String(first - 1), isHighlighted: false },
    ], "the first score keeps the higher place on a tie");
    const aliceScores = savedScores(fake, "Alice");
    assert.equal(aliceScores.length, 2);
    assert.ok(aliceScores[0].date < aliceScores[1].date, "the first game first");
    await closeScoreScreen(fake);
    assertNoErrorLogged(fake);
});
