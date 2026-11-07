// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: a copy left in play_scores\ by a launch PinballY never
// brought back (a crash) is replaced at the next launch, without error,
// and that Play's Play Score is read against the fresh copy.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, PLAY_SCORE_COPY_FOLDER, lastGame } from "./high_scores_scenario.js";

test("a leftover copy from a crashed launch is replaced, and the Play Score is right", async () => {
    const { fake, setBoard, play, personalBoard } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
        // Equal to the scores after the game: read instead of the fresh
        // copy, it would tell no game was played.
        files: { [`${PLAY_SCORE_COPY_FOLDER}\\mm_109c.nv`]: lastGame([3125000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });

    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [3125000]);
    assertNoErrorLogged(fake);
});
