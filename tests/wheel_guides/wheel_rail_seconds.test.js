// ============================================================
// The Wheel Rail through main.js with WHEEL_RAIL_SECONDS=5: it stays 5 s
// after the last change of selected table, then slides away.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("WHEEL_RAIL_SECONDS sets how long the Wheel Rail stays without a move", async () => {
    const { fake } = await startWheelGuides({ settings: { wheelRailSeconds: 5 } });
    fake.moveWheel(1);
    fake.advanceTime(4900);
    assert.equal(shownRail(fake).pill, "B", "still there after 4.9 s");
    fake.advanceTime(1000);
    assert.equal(shownRail(fake), null, "gone after 5 s and the slide");
    assert.equal(fake.logLines().filter(line => line.includes("wheelRailSeconds")).length, 0);
    assertNoErrorLogged(fake);
});
