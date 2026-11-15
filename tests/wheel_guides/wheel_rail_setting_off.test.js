// ============================================================
// WHEEL_RAIL=false through main.js, the Wheel Guides on: no Wheel Rail
// layer, the Wheel Position and the Favorite Heart still there.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, railBaseLayers, railPillLayers, shownPosition, shownHeart } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with WHEEL_RAIL=false, no Wheel Rail", async () => {
    const { fake } = await startWheelGuides({ settings: { wheelRail: false } });
    fake.moveWheel(1);
    fake.advanceTime(10000);
    fake.fire("wheelmode");

    assert.deepEqual([...railBaseLayers(fake), ...railPillLayers(fake)], []);
    assert.equal(shownPosition(fake), "2/5", "the Wheel Position still shows");
    assert.equal(shownHeart(fake), "grey", "the Favorite Heart still shows");
    assertNoErrorLogged(fake);
});
