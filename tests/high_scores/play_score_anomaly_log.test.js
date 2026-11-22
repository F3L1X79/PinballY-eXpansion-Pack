// ============================================================
// The Play Score anomaly log's pure parts on vpxtool's real "nvram show"
// answers saved by the cabinet checks (docs/research/scores-below-board/):
// the compact game state of a line, and the checks on the values.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readNvramAnswer } from "../../common/high_scores/last_game_reader.js";
import { compactGameState, valueAnomaliesOf } from "../../common/high_scores/play_score_anomaly_log.js";

const answer = name => readNvramAnswer(readFileSync(new URL(`../../docs/research/scores-below-board/${name}.json`, import.meta.url), "utf8"));

test("the compact game state, ? for a value outside the NVRAM, an absent field left out", () => {
    assert.equal(compactGameState(answer("wpc_taf_l7_finished").gameState), "scores=[530050,0,0,0] player_count=1 game_over=true");
    assert.equal(compactGameState(answer("stern_m200_stargzr_sweep").gameState),
        "scores=[?,?,?,?] final_scores=[0,0,0,0] player_count=1 game_over=?");
    assert.equal(compactGameState(null), "no game_state");
});

test("the ordinary WPC and SAM answers fail no check", () => {
    assert.deepEqual(valueAnomaliesOf(answer("wpc_taf_l7_quit"), answer("wpc_taf_l7_finished")), []);
    assert.deepEqual(valueAnomaliesOf(answer("sam_trn_174h_quit"), answer("sam_trn_174h_finished")), []);
});

// A Data East or Whitestar answer as vpxtool gives it, from the cabinet's anomaly log.
const deAnswer = (scores, playerCount, gameOver) => ({
    fileFormat: 0.8,
    gameState: { scores: scores.map(value => ({ value })), player_count: { value: playerCount }, game_over: { value: gameOver } },
});

test("no player after the game is over is no impossible value (the cabinet's TMNT and Terminator 3)", () => {
    assert.deepEqual(valueAnomaliesOf(deAnswer([0, 0, 0, 0], 1, false), deAnswer([1147910, 0, 0, 0], 0, true)), []);
    assert.deepEqual(valueAnomaliesOf(deAnswer([0, 0, 0, 0], 0, true), deAnswer([544690, 0, 0, 0], 1, false)), []);
});

test("no player during a game, or more players than slots, is an impossible value", () => {
    assert.deepEqual(valueAnomaliesOf(deAnswer([0, 0, 0, 0], 0, true), deAnswer([544690, 0, 0, 0], 0, false)), [
        { check: "impossibleValues", detail: "player_count 0 for 4 slots" },
    ]);
    assert.deepEqual(valueAnomaliesOf(deAnswer([0, 0, 0, 0], 0, true), deAnswer([544690, 0, 0, 0], 5, true)), [
        { check: "impossibleValues", detail: "player_count 5 for 4 slots" },
    ]);
});

test("a final score not a multiple of 10 is an impossible value (the cabinet's Ms. Pac-Man quit)", () => {
    assert.deepEqual(valueAnomaliesOf(answer("bally_m_mpac_no_game"), answer("bally_m_mpac_quit")), [
        { check: "impossibleValues", detail: "score 1501" },
    ]);
});
