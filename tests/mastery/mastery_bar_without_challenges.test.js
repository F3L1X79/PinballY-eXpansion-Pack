// ============================================================
// With the Challenges off, through main.js on the fake PinballY globals,
// the Mastery Bar takes the Challenge Card's place, right under the
// Profile badge.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownTop, shownMastery, errorLines } from "./mastery_bar_scenario.js";

const BADGE = 170;

test("with the Challenges off, the Mastery Bar sits right under the Profile badge", async () => {
    const fake = await startScenario({ addOns: ["profilePicker", "tableMastery"] });

    assert.equal(shownMastery(fake).head, "Discover");
    assert.equal(shownTop(fake), BADGE);
    assert.deepEqual(errorLines(fake), []);
});
