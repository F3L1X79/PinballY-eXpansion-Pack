// ============================================================
// House Record toast, through main.js on the fake PinballY globals with
// vpxtool installed: a Play Score that takes the Household Board's first
// place from another Profile names it, even as the Profile's first score
// there; one that beats only the Profile's own scores is a Personal Best.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame } from "./high_scores_scenario.js";

test("a House Record toast names the Profile whose first place on the Household Board was taken", async () => {
    const { fake, setBoard, play, switchTo, toasts, showEveryToast } = await startHighScores({
        profiles: { Alice: {}, Bob: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([0, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3000000, 0, 0, 0]) } });
    switchTo("Bob");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3000000, 10, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([4000000, 0, 0, 0]) } });
    switchTo("Alice");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3500000, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([5000000, 0, 0, 0]) } });
    await showEveryToast();

    assert.deepEqual(toasts(), [
        "HIGH SCORE | House Record on Medieval Madness! | 4,000,000 points | taken from Alice",
        "HIGH SCORE | Personal Best on Medieval Madness! | 3,500,000 points",
        "HIGH SCORE | House Record on Medieval Madness! | 5,000,000 points | taken from Bob",
    ], "an equal score never takes the first place: the older one stays first");
    assertNoErrorLogged(fake);
});
