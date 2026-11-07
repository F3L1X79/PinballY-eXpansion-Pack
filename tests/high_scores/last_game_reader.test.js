// ============================================================
// The last game reader on vpxtool's real "nvram show" answers saved by the
// cabinet checks (docs/research/scores-below-board/), and the Play Score
// rule that compares the .nv copied at launch with the .nv after the game.
// Run with "node --test" from the project folder.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readLastGame, readNvramAnswer, lastGameOf, playScoreOf } from "../../common/high_scores/last_game_reader.js";

const answer = name => readFileSync(new URL(`../../docs/research/scores-below-board/${name}.json`, import.meta.url), "utf8");
const lastGame = name => readLastGame(answer(name));

test("WPC: the scores, the player count and game over", () => {
    assert.deepEqual(lastGame("wpc_taf_l7_finished"), { scores: [530050, 0, 0, 0], finalScores: null, playerCount: 1, gameOver: true });
});

test("SAM: no game over in the map reads as unknown", () => {
    assert.deepEqual(lastGame("sam_trn_174h_finished"), { scores: [1381500, 0, 0, 0], finalScores: null, playerCount: 1, gameOver: null });
});

test("Bally 6800: a player count outside the NVRAM reads as unknown, the final scores are read", () => {
    assert.deepEqual(lastGame("bally_m_mpac_finished_1p"), { scores: [0, 0, 0, 0], finalScores: [159560, 0, 0, 0], playerCount: null, gameOver: false });
});

test("Stern M-200: scores outside the NVRAM are no last-game scores", () => {
    assert.equal(lastGame("stern_m200_stargzr_sweep"), null);
});

test("an answer that is not vpxtool's JSON cannot be read", () => {
    assert.throws(() => readLastGame("Error: no map for this ROM\n"), /no JSON/);
    assert.throws(() => readLastGame("{ \"game_state\": "), /not readable/);
});

test("an answer without game_state has no last-game scores", () => {
    assert.equal(readLastGame("{\"_fileformat\": 0.8, \"audits\": {}}"), null);
});

test("WPC: a finished game gives its best slot, a quit one and a launch without a game give none", () => {
    assert.deepEqual(playScoreOf(lastGame("wpc_taf_l7_quit"), lastGame("wpc_taf_l7_finished")), { score: 530050 });
    assert.ok(playScoreOf(lastGame("wpc_taf_l7_finished"), lastGame("wpc_taf_l7_quit")).none);
    assert.ok(playScoreOf(lastGame("wpc_taf_l7_no_game"), lastGame("wpc_taf_l7_no_game")).none);
});

test("SAM: a game is accepted, game over being unknown", () => {
    assert.deepEqual(playScoreOf(lastGame("sam_trn_174h_quit"), lastGame("sam_trn_174h_finished")), { score: 1381500 });
});

test("Bally 6800: a finished game gives the best final score, a quit one and a launch without a game give none", () => {
    const noGame = lastGame("bally_m_mpac_no_game");
    assert.deepEqual(playScoreOf(noGame, lastGame("bally_m_mpac_finished_1p")), { score: 159560 });
    assert.deepEqual(playScoreOf(noGame, lastGame("bally_m_mpac_finished_2p")), { score: 162090 });
    assert.ok(playScoreOf(noGame, lastGame("bally_m_mpac_quit")).none);
    assert.ok(playScoreOf(lastGame("bally_m_mpac_finished_1p"), noGame).none);
});

test("with a player count, a finished game's final scores win over the scores (#481's rule; no real sample has both)", () => {
    const slots = values => values.map((value, index) => ({ label: `Player ${index + 1}`, value }));
    const answerOf = (scores, finalScores, gameOver) => JSON.stringify({
        game_state: { player_count: { value: 1 }, game_over: { value: gameOver }, scores: slots(scores), final_scores: slots(finalScores) },
    });
    const before = readLastGame(answerOf([0, 0, 0, 0], [800000, 0, 0, 0], true));
    assert.deepEqual(playScoreOf(before, readLastGame(answerOf([0, 0, 0, 0], [950000, 0, 0, 0], true))), { score: 950000 });
    assert.ok(playScoreOf(before, readLastGame(answerOf([0, 0, 0, 0], [800000, 0, 0, 0], true))).none, "final scores unchanged: no game");
});

test("the raw answer: the file format and the game state", () => {
    const wpc = readNvramAnswer(answer("wpc_taf_l7_finished"));
    assert.equal(wpc.fileFormat, 0.8);
    assert.deepEqual(lastGameOf(wpc.gameState), lastGame("wpc_taf_l7_finished"));
    assert.deepEqual(readNvramAnswer("{\"_fileformat\": 0.8}"), { fileFormat: 0.8, gameState: null });
    assert.throws(() => readNvramAnswer("{ \"game_state\": "), /not readable/);
});

test("no last-game scores before or after the game give none", () => {
    assert.ok(playScoreOf(null, lastGame("wpc_taf_l7_finished")).none);
    assert.ok(playScoreOf(lastGame("wpc_taf_l7_quit"), null).none);
});
