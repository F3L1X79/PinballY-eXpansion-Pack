// ============================================================
// The Wheel Rail through main.js with WHEEL_RAIL_SECONDS=0: always shown,
// with no slide-out and no fade, on startup and after a move.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, railBaseLayers } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// The rail's place in its window when it shows: 0.8 % of the width from the right edge.
const IN_PLACE_X = -0.008;
const baseLook = fake => {
    const [base] = railBaseLayers(fake).filter(layer => layer.alpha > 0);
    return { x: base.position().x, alpha: base.alpha };
};

test("WHEEL_RAIL_SECONDS=0 keeps the Wheel Rail always shown", async () => {
    const { fake } = await startWheelGuides({ settings: { wheelRailSeconds: 0 } });
    fake.advanceTime(10000);
    assert.equal(shownRail(fake).pill, "A", "still there 10 s after startup");
    assert.deepEqual(baseLook(fake), { x: IN_PLACE_X, alpha: 1 });

    fake.moveWheel(1);
    assert.deepEqual(baseLook(fake), { x: IN_PLACE_X, alpha: 1 }, "no fade-in on a move");
    fake.advanceTime(60000);
    assert.equal(shownRail(fake).pill, "B", "still there a minute later");
    assert.deepEqual(baseLook(fake), { x: IN_PLACE_X, alpha: 1 });
    assert.equal(fake.logLines().filter(line => line.includes("wheelRailSeconds")).length, 0);
    assertNoErrorLogged(fake);
});
