// ============================================================
// A Ratings Achievement lost and won back, through main.js on the fake
// PinballY globals: removing the only Rating makes First Verdict missing
// again; rating a table again brings it back without a second toast.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startRatingsScenario, MEDIEVAL, MARS } from "./ratings_family_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("a removed Rating loses the step, and its return is not announced again", async () => {
    const { fake, titles, familyToasts, newToastTexts, rate, play, listRows } = await startRatingsScenario({
        active: "Alice",
        ratings: { Alice: { [MEDIEVAL.configId]: 4 } },
    });
    const [firstVerdict] = titles;
    const isUnlocked = () => listRows().find(row => row.title === firstVerdict).unlocked;
    assert.deepEqual(familyToasts(await newToastTexts()), [firstVerdict]);

    rate(MEDIEVAL, -1);
    assert.equal(isUnlocked(), false, "no Rating left");

    rate(MARS, 3);
    await play();
    assert.deepEqual(familyToasts(await newToastTexts()), []);
    assert.equal(isUnlocked(), true);
    assertNoErrorLogged(fake);
});
