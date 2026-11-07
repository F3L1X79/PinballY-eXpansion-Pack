// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: a file over 100 KB at startup becomes the .old.log
// before the session's first line, replacing an older one.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, ANOMALY_LOG, OLD_ANOMALY_LOG, lastGame } from "./high_scores_scenario.js";

const FULL_LOG = `2026-10-01 20:00:00 "${MEDIEVAL}" mm_109c noMap: - -> -\r\n`.repeat(2000);

test("an anomaly log over 100 KB becomes the .old.log", async () => {
    assert.ok(Buffer.byteLength(FULL_LOG) > 100 * 1024);
    const { fake, setBoard, play, anomalies } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
        files: { [ANOMALY_LOG]: FULL_LOG, [OLD_ANOMALY_LOG]: "an older one\r\n" },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([15000000, 0, 0, 0]) } });

    assert.equal(fake.readFile(OLD_ANOMALY_LOG), FULL_LOG);
    assert.equal(anomalies().length, 1);
    assert.match(anomalies()[0], / shouldHaveEnteredBoard /);
    assertNoErrorLogged(fake);
});
