// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: a Play Score above the lowest place of the board read
// after the Play, while the Play won no High Score, writes a line on every
// such Play. The Play Score is kept.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("a Play Score that should have entered the board writes a line each Play", async () => {
    const { fake, setBoard, play, personalBoard, anomalies } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([15000000, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([16000000, 0, 0, 0]) } });

    assert.deepEqual(anomalies(), [
        `"${MEDIEVAL}" mm_109c shouldHaveEnteredBoard (Play Score 15000000, lowest place 10000000): scores=[2500000,0,0,0] player_count=1 game_over=true -> scores=[15000000,0,0,0] player_count=1 game_over=true`,
        `"${MEDIEVAL}" mm_109c shouldHaveEnteredBoard (Play Score 16000000, lowest place 10000000): scores=[15000000,0,0,0] player_count=1 game_over=true -> scores=[16000000,0,0,0] player_count=1 game_over=true`,
    ]);
    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [16000000, 15000000]);
    assertNoErrorLogged(fake);
});
