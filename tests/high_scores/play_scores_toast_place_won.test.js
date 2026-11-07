// ============================================================
// One toast per Play, through main.js on the fake PinballY globals with
// vpxtool installed: a Play that wins a place on the table's board and
// beats the household shows the High Score Toast only.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("a Play that wins a place and beats the household shows only the High Score Toast", async () => {
    const { fake, setBoard, play, switchTo, toasts, showEveryToast } = await startHighScores({
        profiles: { Alice: {}, Bob: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([0, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3000000, 0, 0, 0]) } });
    switchTo("Bob");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([2000000, 0, 0, 0]) } });
    await play(MEDIEVAL, {
        after: board(["SLL", "52000000"], ["BOB", "45000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]),
        nvAfter: { mm_109c: lastGame([45000000, 1000000, 0, 0]) },
    });
    await showEveryToast();

    assert.deepEqual(toasts(), ["2 | HIGH SCORE | High score on Medieval Madness: 2nd place | 45,000,000 points"]);
    assertNoErrorLogged(fake);
});
