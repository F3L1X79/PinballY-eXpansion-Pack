// ============================================================
// Personal Best toast, through main.js on the fake PinballY globals with
// vpxtool installed: never for the first score on a table, then for a Play
// Score above all the Profile's earlier ones, a first place it already held
// on the Household Board included; none for an equal or lower one.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("a Personal Best toast for a Play Score above the Profile's earlier ones, never for its first", async () => {
    const { fake, setBoard, play, toasts, showEveryToast } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([0, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([2000000, 0, 0, 0]) } });
    await showEveryToast();
    assert.deepEqual(toasts(), [], "no toast for the first score on the table");

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });
    await showEveryToast();
    assert.deepEqual(toasts(), ["HIGH SCORE | Personal Best on Medieval Madness! | 3,125,000 points"],
        "Alice already held the Household Board's first place: a Personal Best, no House Record");

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 10, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([1000000, 0, 0, 0]) } });
    await showEveryToast();
    assert.equal(toasts().length, 1, "no toast for an equal or a lower score");
    assertNoErrorLogged(fake);
});
