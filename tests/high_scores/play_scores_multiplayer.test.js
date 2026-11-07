// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: a multiplayer game gives its best slot as the Play's Play
// Score, whatever the player count says.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, AFM, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("a multiplayer game gives the best slot", async () => {
    const { fake, setBoard, play, personalBoard } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { afm_113b: lastGame([0, 0, 0, 0]) },
    });
    setBoard(AFM, FACTORY);

    await play(AFM, { after: FACTORY, nvAfter: { afm_113b: lastGame([1200000, 4700000, 2100000, 0], { playerCount: 3 }) } });

    assert.deepEqual(await personalBoard(AFM, "Alice"), [{ rank: 1, score: 4700000, date: "2026-10-12T20:00:00" }]);
    assertNoErrorLogged(fake);
});
