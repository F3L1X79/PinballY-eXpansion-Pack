// ============================================================
// Play Settlement's Play Score on its own (play_settlement_setup.js), with
// the fake vpxtool: the .nv copied at launch, the "changed .nv" rule,
// vpxtool's answer, the anomaly log, and one announcement per Play, even
// when the NVRAM watch or the Play reaches it after the launch's end.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";
import { startSettlement, play, placeOf } from "./play_settlement_setup.js";
import {
    FACTORY, SECOND_PLACE, MEDIEVAL, VPX_TABLES, VPXTOOL, PLAY_SCORE_COPY_FOLDER, ANOMALY_LOG, lastGame, nvFileOf,
} from "./high_scores_scenario.js";

// Plays Medieval Madness, its board unchanged unless boardAfter is given,
// VPinMAME saving nvAfter as the game ends (none: the .nv untouched).
function playMedieval(fake, { nvAfter, boardAfter = FACTORY, ...options } = {}) {
    return play(fake, MEDIEVAL, {
        ...options,
        after: () => {
            fake.setNvramBoard(MEDIEVAL, boardAfter);
            if (nvAfter !== undefined) fake.addFile(nvFileOf("mm_109c"), nvAfter);
        },
    });
}

function startOnMedieval(options = {}) {
    const started = startSettlement({ tables: VPX_TABLES, vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) }, ...options });
    started.fake.setNvramBoard(MEDIEVAL, FACTORY);
    return started;
}

const playScoreLines = log => log().filter(line => line.includes("Play Score"));
const scoresOf = announced => announced.map(({ record, score }) => [record.kind, score]);

test("a Play Score beating the Profile's earlier ones announces a Personal Best, from a multiplayer game's best slot", async () => {
    const { fake, announced, log } = startOnMedieval();
    await playMedieval(fake, { nvAfter: lastGame([3000000, 0, 0, 0]) });
    assert.deepEqual(announced, [], "a first Play Score beats nothing");
    await playMedieval(fake, { nvAfter: lastGame([1200000, 4700000, 2100000, 0], { playerCount: 3 }) });
    assert.deepEqual(scoresOf(announced), [["personalBest", 4700000]]);
    assert.equal(announced[0].configId, MEDIEVAL);
    assert.deepEqual(playScoreLines(log), [
        `[HighScores] "${MEDIEVAL}": Play Score for Alice: 3000000.`,
        `[HighScores] "${MEDIEVAL}": Play Score for Alice: 4700000.`,
    ]);
    assertNoErrorLogged(fake);
});

test("no .nv to copy at launch: no Play Score, logged", async () => {
    const { fake, announced, log } = startOnMedieval({ nvFiles: {} });
    await playMedieval(fake, { nvAfter: lastGame([3000000, 0, 0, 0]) });
    assert.deepEqual(announced, []);
    assert.deepEqual(playScoreLines(log), [`[HighScores] "${MEDIEVAL}": no Play Score for Alice: ${nvFileOf("mm_109c")} did not exist at launch.`]);
    assertNoErrorLogged(fake);
});

test("a .nv the game did not change gives no Play Score, logged", async () => {
    const { fake, announced, log } = startOnMedieval();
    await playMedieval(fake);
    assert.deepEqual(announced, []);
    assert.deepEqual(playScoreLines(log), [`[HighScores] "${MEDIEVAL}": no Play Score for Alice: mm_109c.nv did not change during the game.`]);
    assertNoErrorLogged(fake);
});

test("vpxtool without a map for the ROM gives no Play Score and an anomaly; a failing vpxtool is an error; the place is still announced", async () => {
    const { fake, announced, log } = startOnMedieval();
    fake.addProgram(VPXTOOL, () => ({ exitCode: 1, output: "" }));
    await playMedieval(fake, { nvAfter: lastGame([3000000, 0, 0, 0]), boardAfter: SECOND_PLACE });
    const copy = `${PLAY_SCORE_COPY_FOLDER}\\mm_109c.nv`;
    assert.ok(log().includes(`[HighScores] "${MEDIEVAL}": vpxtool reads no last game in ${copy} (exit code 1, no map for this ROM); no Play Score.`));
    assert.match(fake.readFile(ANOMALY_LOG), /mm_109c noMap/);
    assert.deepEqual(announced.map(placeOf), [[2, "ALI"]]);
    assertNoErrorLogged(fake);

    fake.addProgram(VPXTOOL, () => ({ output: "thread 'main' panicked" }));
    await playMedieval(fake, { nvAfter: lastGame([3100000, 0, 0, 0]) });
    assert.deepEqual(errorLines(fake), [
        `[HighScores] ERROR "${MEDIEVAL}": ${copy} not read by vpxtool (no JSON in vpxtool's answer ("thread 'main' panicked")); no Play Score.`,
    ]);
});

test("a game under a minute gives no Play Score and logs none", async () => {
    const { fake, announced, log } = startOnMedieval();
    await playMedieval(fake, { nvAfter: lastGame([3000000, 0, 0, 0]), durationMs: 30000 });
    assert.deepEqual(announced, []);
    assert.deepEqual(playScoreLines(log), []);
    assertNoErrorLogged(fake);
});

test("an unfinished game gives no Play Score, logged", async () => {
    const { fake, announced, log } = startOnMedieval();
    await playMedieval(fake, { nvAfter: lastGame([3125000, 0, 0, 0], { gameOver: false }) });
    assert.deepEqual(announced, []);
    assert.deepEqual(playScoreLines(log), [`[HighScores] "${MEDIEVAL}": no Play Score for Alice: the game was left unfinished.`]);
    assertNoErrorLogged(fake);
});

test("a Play Score above the board's lowest place, with no place won, is an anomaly", async () => {
    const { fake } = startOnMedieval();
    await playMedieval(fake, { nvAfter: lastGame([15000000, 0, 0, 0]) });
    assert.match(fake.readFile(ANOMALY_LOG), /mm_109c shouldHaveEnteredBoard \(Play Score 15000000, lowest place 10000000\)/);
    assertNoErrorLogged(fake);
});

test("a Play that wins a place and a Personal Best is announced once, for its place", async () => {
    const { fake, announced, log } = startOnMedieval();
    await playMedieval(fake, { nvAfter: lastGame([3000000, 0, 0, 0]) });
    // The second player's 46,000,000 beats the place the first one won.
    await playMedieval(fake, { nvAfter: lastGame([45000000, 46000000, 0, 0], { playerCount: 2 }), boardAfter: SECOND_PLACE });
    assert.ok(log().includes(`[HighScores] "${MEDIEVAL}": Play Score for Alice: 46000000.`));
    assert.deepEqual(announced.map(placeOf), [[2, "ALI"]]);
    assertNoErrorLogged(fake);
});

test("the NVRAM watch heard after Play Settlement still gives the Play Score", async () => {
    const { fake, announced } = startOnMedieval({ watchLate: true });
    await playMedieval(fake, { nvAfter: lastGame([3000000, 0, 0, 0]) });
    await playMedieval(fake, { nvAfter: lastGame([4000000, 0, 0, 0]) });
    assert.deepEqual(scoresOf(announced), [["personalBest", 4000000]]);
    assertNoErrorLogged(fake);
});

test("a Play announced after the launch's end is still settled", async () => {
    const { fake, announced, deliverPlays, log } = startOnMedieval({ playLate: true });
    await playMedieval(fake, { nvAfter: lastGame([3000000, 0, 0, 0]), boardAfter: SECOND_PLACE, afterEnd: deliverPlays });
    assert.deepEqual(announced.map(placeOf), [[2, "ALI"]]);
    assert.ok(log().includes(`[HighScores] "${MEDIEVAL}": Play Score for Alice: 3000000.`), "its Play Score too");
    assertNoErrorLogged(fake);
});
