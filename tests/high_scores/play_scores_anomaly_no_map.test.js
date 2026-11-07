// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: a ROM vpxtool has no map of (non-zero exit code),
// played twice in one session, writes one line, nothing read before or
// after; a line of an earlier session does not stop it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, VPXTOOL, ANOMALY_LOG, lastGame } from "./high_scores_scenario.js";

const EARLIER_LINE = `2026-10-11 21:00:00 "${MEDIEVAL}" mm_109c noMap: - -> -`;

test("a ROM without a map writes one line per session", async () => {
    const { fake, setBoard, play, anomalies } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
        files: { [ANOMALY_LOG]: `${EARLIER_LINE}\r\n` },
    });
    setBoard(MEDIEVAL, FACTORY);
    fake.addProgram(VPXTOOL, () => ({ exitCode: 1, output: "" }));

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([4250000, 0, 0, 0]) } });

    assert.deepEqual(anomalies(), [
        `"${MEDIEVAL}" mm_109c noMap: - -> -`,
        `"${MEDIEVAL}" mm_109c noMap: - -> -`,
    ], "the earlier session's line, then this session's one");
    assertNoErrorLogged(fake);
});
