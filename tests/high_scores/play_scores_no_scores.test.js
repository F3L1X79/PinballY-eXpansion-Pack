// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: a .nv whose every slot is 0, then one whose map keeps no
// last-game scores, give no Play Score; the log says why, without error.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

// vpxtool's answer for a .nv whose map has no game_state.
const NO_GAME_STATE = JSON.stringify({ _fileformat: 0.8, high_scores: [] }, null, 2);

test("every slot at 0, or no last-game scores in the .nv: no Play Score, logged", async () => {
    const { fake, setBoard, play, personalBoard, log } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([0, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: NO_GAME_STATE } });

    assert.deepEqual(await personalBoard(MEDIEVAL, "Alice"), []);
    assert.deepEqual(log().filter(line => line.includes("Play Score")), [
        `[HighScores] "${MEDIEVAL}": no Play Score for Alice: every score is 0.`,
        `[HighScores] "${MEDIEVAL}": no Play Score for Alice: no last-game scores in the .nv.`,
    ]);
    assertNoErrorLogged(fake);
});
