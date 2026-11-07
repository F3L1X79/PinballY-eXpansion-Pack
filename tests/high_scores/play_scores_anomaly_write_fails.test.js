// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: a locked file gives one logfile.log line for the
// whole session, never an error, and each Play Score is still kept.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, ANOMALY_LOG, lastGame } from "./high_scores_scenario.js";

test("a failing write is logged once and the Play Scores are kept", async () => {
    const { fake, setBoard, play, personalBoard, log } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
        files: { [ANOMALY_LOG]: "" },
    });
    fake.lockFile(ANOMALY_LOG);
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([15000000, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([16000000, 0, 0, 0]) } });

    assert.deepEqual(log().filter(line => line.includes("play_scores_anomalies")), [
        `[HighScores] play_scores_anomalies.log could not be written: Permission denied: ${ANOMALY_LOG}`,
    ]);
    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [16000000, 15000000]);
    assertNoErrorLogged(fake);
});
