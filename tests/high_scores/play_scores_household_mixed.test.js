// ============================================================
// Play Scores on the Household Board, through main.js on the fake PinballY
// globals with vpxtool installed: a Profile whose best is a High Score and
// one whose best is a Play Score rank together, each Profile once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("a best High Score and a best Play Score rank together on the Household Board", async () => {
    const { fake, setBoard, play, switchTo, householdBoard } = await startHighScores({
        profiles: { Alice: {}, Bob: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([0, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);
    const aliceSecond = board(["SLL", "52000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]);

    await play(MEDIEVAL, { after: aliceSecond, nvAfter: { mm_109c: lastGame([45000000, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: aliceSecond, nvAfter: { mm_109c: lastGame([5000000, 0, 0, 0]) } });
    switchTo("Bob");
    await play(MEDIEVAL, { after: aliceSecond, nvAfter: { mm_109c: lastGame([8000000, 0, 0, 0]) } });
    assert.deepEqual(await householdBoard(MEDIEVAL), [["Alice", 45000000], ["Bob", 8000000]]);

    await play(MEDIEVAL, { after: aliceSecond, nvAfter: { mm_109c: lastGame([9000000, 0, 0, 0]) } });
    switchTo("Alice");
    assert.deepEqual(await householdBoard(MEDIEVAL), [["Alice", 45000000], ["Bob", 9000000]], "Bob's best Play Score, once");
    assertNoErrorLogged(fake);
});
