// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: scores outside the NVRAM while the final scores
// changed during the Play (Stern M-200) write one line, "?" for the values
// outside the NVRAM. No Play Score comes of it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("final scores changed with scores outside the NVRAM write one line", async () => {
    const stern = finalScores => lastGame([null, null, null, null], { gameOver: null, finalScores });
    const { fake, setBoard, play, personalBoard, anomalies } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: stern([0, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: stern([812340, 0, 0, 0]) } });

    assert.deepEqual(anomalies(), [
        `"${MEDIEVAL}" mm_109c finalScoresOnly: scores=[?,?,?,?] final_scores=[0,0,0,0] player_count=1 game_over=? -> scores=[?,?,?,?] final_scores=[812340,0,0,0] player_count=1 game_over=?`,
    ]);
    assert.deepEqual(await personalBoard(MEDIEVAL, "Alice"), []);
    assertNoErrorLogged(fake);
});
