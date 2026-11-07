// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: no .nv changed, several changed, or another ROM's changed
// during the Play: no Play Score is read, and the log says why.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("only the table's own .nv, changed alone, gives a Play Score", async () => {
    const { fake, setBoard, play, personalBoard, log } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]), afm_113b: lastGame([900000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);
    const scored = lastGame([3125000, 0, 0, 0]);

    await play(MEDIEVAL, { after: FACTORY });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: scored, afm_113b: lastGame([1000000, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { afm_113b: lastGame([1100000, 0, 0, 0]) } });
    assert.deepEqual(await personalBoard(MEDIEVAL, "Alice"), []);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([4250000, 0, 0, 0]) } });
    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [4250000]);
    assert.deepEqual(log().filter(line => line.includes("no Play Score")), [
        `[HighScores] "${MEDIEVAL}": no Play Score for Alice: mm_109c.nv did not change during the game.`,
        `[HighScores] "${MEDIEVAL}": no Play Score for Alice: 2 .nv files changed during the game (mm_109c, afm_113b).`,
        `[HighScores] "${MEDIEVAL}": no Play Score for Alice: afm_113b.nv changed during the game, not the table's mm_109c.nv.`,
    ]);
    assertNoErrorLogged(fake);
});
