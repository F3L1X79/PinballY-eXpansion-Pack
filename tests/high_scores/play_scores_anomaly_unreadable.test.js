// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: an answer that is not readable JSON writes one line
// (nothing read), besides the error already logged; the Play's High
// Score is credited.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { startHighScores, FACTORY, SECOND_PLACE, MEDIEVAL, VPX_TABLES, VPXTOOL, lastGame } from "./high_scores_scenario.js";

test("an unreadable answer writes one line and the High Score stays", async () => {
    const { fake, setBoard, play, personalBoard, anomalies } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);
    fake.addProgram(VPXTOOL, () => ({ output: "thread 'main' panicked" }));

    await play(MEDIEVAL, { after: SECOND_PLACE, nvAfter: { mm_109c: lastGame([45000000, 0, 0, 0]) } });

    assert.deepEqual(anomalies(), [`"${MEDIEVAL}" mm_109c unreadableAnswer: - -> -`]);
    assert.equal(errorLines(fake).length, 1);
    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [45000000]);
});
