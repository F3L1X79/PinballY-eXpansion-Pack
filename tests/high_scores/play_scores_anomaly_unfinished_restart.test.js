// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: the unfinished Plays in a row are counted across
// restarts (2 kept in high_scores.json make the next one the third), and a
// Play Score removes the count from the file.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, HIGH_SCORES_FILE, lastGame } from "./high_scores_scenario.js";

test("2 unfinished Plays before the restart and one after write the line", async () => {
    const { fake, setBoard, play, anomalies, saved } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
        files: { [HIGH_SCORES_FILE]: JSON.stringify({ version: 1, tables: {}, highScores: [], unfinishedInARow: { mm_109c: 2 } }) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([1000000, 0, 0, 0], { gameOver: false }) } });
    assert.equal(anomalies().length, 1);
    assert.match(anomalies()[0], /^"Medieval Madness \(Williams 1997\)" mm_109c unfinishedInARow \(3 Plays in a row\): /);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });
    assert.equal(saved().unfinishedInARow, undefined, "a Play Score clears the count");
    assertNoErrorLogged(fake);
});
