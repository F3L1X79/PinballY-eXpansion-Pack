// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: a game the .nv tells unfinished (game_over false) gives no
// Play Score, logged; one whose game_over is outside the NVRAM (SAM), where
// a quit cannot be told, is accepted.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("an unfinished game gives no Play Score; an unknown game over is accepted", async () => {
    const { fake, setBoard, play, personalBoard, log } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0], { gameOver: false }) } });
    assert.deepEqual(await personalBoard(MEDIEVAL, "Alice"), []);
    assert.deepEqual(log().filter(line => line.includes("Play Score")), [
        `[HighScores] "${MEDIEVAL}": no Play Score for Alice: the game was left unfinished.`,
    ]);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([4250000, 0, 0, 0], { gameOver: null }) } });
    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [4250000]);
    assertNoErrorLogged(fake);
});
