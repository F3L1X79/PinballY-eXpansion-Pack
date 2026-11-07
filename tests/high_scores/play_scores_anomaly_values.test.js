// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: an unknown _fileformat and impossible values (a player
// count above the score slots, a score not a multiple of 10) write a line
// each, once per ROM and session however often the ROM is played.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("an unknown format and impossible values write one line each per session", async () => {
    const { fake, setBoard, play, personalBoard, anomalies } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);
    const odd = score => lastGame([score, 0, 0, 0], { playerCount: 153, fileFormat: 0.9 });

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: odd(3125005) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: odd(4250005) } });

    const before = "scores=[2500000,0,0,0] player_count=1 game_over=true";
    const after = "scores=[3125005,0,0,0] player_count=153 game_over=true";
    assert.deepEqual(anomalies(), [
        `"${MEDIEVAL}" mm_109c unknownFormat (_fileformat 0.9): ${before} -> ${after}`,
        `"${MEDIEVAL}" mm_109c impossibleValues (player_count 153 for 4 slots, score 3125005): ${before} -> ${after}`,
    ]);
    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [4250005, 3125005], "the rules still apply");
    assertNoErrorLogged(fake);
});
