// ============================================================
// Play Scores, through main.js on the fake PinballY globals without
// vpxtool: no .nv is copied nor read, nothing new is logged, and the
// Personal Board keeps to High Scores, as before Play Scores.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, PLAY_SCORE_COPY_FOLDER, lastGame } from "./high_scores_scenario.js";

test("without vpxtool, nothing is read and nothing new is logged", async () => {
    const { fake, setBoard, play, personalBoard, log } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });

    assert.deepEqual(await personalBoard(MEDIEVAL, "Alice"), []);
    assert.deepEqual(fake.programRuns(), []);
    assert.equal(fake.fileOperations().some(operation => (operation.to || operation.path).startsWith(PLAY_SCORE_COPY_FOLDER)), false);
    assert.deepEqual(log(), [
        `[HighScores] "${MEDIEVAL}": first board read, 5 places, all Default Scores.`,
        `[HighScores] "${MEDIEVAL}": Play by Alice, no new place.`,
    ]);
    assertNoErrorLogged(fake);
});
