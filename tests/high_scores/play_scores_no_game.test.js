// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: a table launched and left without starting a game, whose
// .nv VPinMAME still saves, gives no Play Score; the log says why.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("scores equal to those at launch give no Play Score, logged", async () => {
    const { fake, setBoard, play, personalBoard, log } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([2500000, 0, 0, 0]) } });

    assert.deepEqual(await personalBoard(MEDIEVAL, "Alice"), []);
    assert.deepEqual(log().filter(line => line.includes("Play Score")), [
        `[HighScores] "${MEDIEVAL}": no Play Score for Alice: the scores did not change, no game was played.`,
    ]);
    assertNoErrorLogged(fake);
});
