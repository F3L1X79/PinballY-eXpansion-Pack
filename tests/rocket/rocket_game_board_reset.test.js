// ============================================================
// The Rocket Board through main.js, after a Profile Reset: the reset
// Profile's scores are gone from its profile.json and its lines from the
// board, the others moving up; a game below the Profile's own five best is
// not saved, and nothing is highlighted.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startRocketGame, chooseRocketGame, untilCrash, untilScoreScreen, boardLines, hadTheRocket, profileFile, LEAVING_MS,
} from "./rocket_game_scenario.js";

const HIGH = [900000, 800000, 700000, 600000, 500000];
const scoresOf = values => values.map((score, index) => ({ score, date: `2026-11-0${index + 1}T10:00:00` }));
const line = (place, name, score) => ({ place: String(place), name, score: String(score), isHighlighted: false });

async function playOneGame(fake, lang) {
    await chooseRocketGame(fake, lang);
    untilCrash(fake, lang);
    untilScoreScreen(fake);
    const lines = boardLines(fake);
    press(fake, "Select");
    await settle();
    fake.advanceTime(LEAVING_MS + 50);
    await settle();
    return lines;
}

test("a Profile Reset takes that Profile's lines off the board; a game below the Profile's five best is not saved", async () => {
    const { fake, lang, store } = await startRocketGame({
        profiles: { Alice: { rocketScores: scoresOf([950000, 850000]) }, Bob: { ...hadTheRocket, rocketScores: scoresOf(HIGH) } },
        active: "Bob",
    });
    const bobBefore = fake.readFile(profileFile("Bob"));

    assert.deepEqual(await playOneGame(fake, lang), [
        line(1, "Alice", 950000), line(2, "Bob", 900000), line(3, "Alice", 850000), line(4, "Bob", 800000), line(5, "Bob", 700000),
    ], "not on the board, nothing highlighted");
    assert.equal(fake.readFile(profileFile("Bob")), bobBefore, "below Bob's own five best: not saved");

    store.resetProfile("Alice");
    assert.equal("rocketScores" in JSON.parse(fake.readFile(profileFile("Alice"))), false, "dropped by the Reset");
    assert.deepEqual(await playOneGame(fake, lang), HIGH.map((score, index) => line(index + 1, "Bob", score)), "the others move up");
    assertNoErrorLogged(fake);
});
