// ============================================================
// Play Scores, through main.js on the fake PinballY globals: vpxtool
// fails, then never answers, then answers garbage. Each is logged as an
// error with the table, and every Play keeps the High Score it won.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { errorLines } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, VPX_TABLES, VPXTOOL, PLAY_SCORE_COPY_FOLDER, lastGame } from "./high_scores_scenario.js";
import { VPXTOOL_RUN_TIMEOUT_MS } from "../../common/vpxtool/vpxtool_runner.js";

test("a vpxtool failure, timeout or garbage is logged, and the High Scores are credited", async () => {
    const { fake, setBoard, play, personalBoard } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);
    const nvAfter = { mm_109c: lastGame([3125000, 0, 0, 0]) };

    fake.addProgram(VPXTOOL, () => ({ exitCode: 1, output: "" }));
    await play(MEDIEVAL, { nvAfter, after: board(["SLL", "52000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]) });

    fake.addProgram(VPXTOOL, () => ({ durationMs: 10 * VPXTOOL_RUN_TIMEOUT_MS }));
    await play(MEDIEVAL, { nvAfter, after: board(["SLL", "52000000"], ["ALI", "47000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["LFS", "30000000"]) });
    for (let second = 0; second < VPXTOOL_RUN_TIMEOUT_MS / 1000; second++) {
        fake.advanceTime(1000);
        await settle();
    }

    fake.addProgram(VPXTOOL, () => ({ output: "thread 'main' panicked" }));
    await play(MEDIEVAL, { nvAfter, after: board(["SLL", "52000000"], ["ALI", "48000000"], ["ALI", "47000000"], ["ALI", "45000000"], ["BRE", "40000000"]) });

    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [48000000, 47000000, 45000000]);
    const copy = `${PLAY_SCORE_COPY_FOLDER}\\mm_109c.nv`;
    assert.deepEqual(errorLines(fake), [
        `[HighScores] ERROR "${MEDIEVAL}": ${copy} not read by vpxtool (exit code 1); no Play Score.`,
        `[HighScores] ERROR "${MEDIEVAL}": ${copy} not read by vpxtool (no answer from vpxtool within 60 s); no Play Score.`,
        `[HighScores] ERROR "${MEDIEVAL}": ${copy} not read by vpxtool (no JSON in vpxtool's answer ("thread 'main' panicked")); no Play Score.`,
    ]);
});
