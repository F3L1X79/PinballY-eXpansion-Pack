// ============================================================
// Play Score toasts for Guest, through main.js on the fake PinballY globals
// with vpxtool installed: Guest beating its own score gets a Personal
// Best, and never a House Record, even first among every score.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("Guest gets a Personal Best, never a House Record", async () => {
    const { fake, setBoard, play, switchTo, toasts, showEveryToast } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([0, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3000000, 0, 0, 0]) } });
    switchTo("guest");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([4000000, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([5000000, 0, 0, 0]) } });
    await showEveryToast();

    assert.deepEqual(toasts(), ["HIGH SCORE | Personal Best on Medieval Madness! | 5,000,000 points"]);
    assertNoErrorLogged(fake);
});
