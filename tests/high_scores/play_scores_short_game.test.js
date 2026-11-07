// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: a launch shorter than a minute is no Play, so it gives no
// Play Score, and nothing is logged about it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("a game under a minute gives no Play Score and logs none", async () => {
    const { fake, setBoard, play, personalBoard, log } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) }, durationMs: 50 * 1000 });

    assert.deepEqual(await personalBoard(MEDIEVAL, "Alice"), []);
    assert.deepEqual(log().filter(line => line.includes("Play Score")), []);
    assertNoErrorLogged(fake);
});
