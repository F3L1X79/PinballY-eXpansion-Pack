// ============================================================
// WHEEL_POSITION=false through main.js, the Wheel Guides on: no Wheel
// Position layer, the Favorite Heart still there, and the lower status line
// keeps its "Table n/total".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, positionLayers, positionedMessages, shownHeart } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with WHEEL_POSITION=false, no Wheel Position and the status line keeps its position", async () => {
    const { fake } = await startWheelGuides({ settings: { wheelPosition: false } });
    fake.moveWheel(1);
    fake.fire("wheelmode");

    assert.deepEqual(positionLayers(fake), []);
    assert.equal(shownHeart(fake), "grey", "the Favorite Heart still shows");
    assert.ok(positionedMessages(fake).includes("Table 2/[Filter.Count] - made by [Game.Manuf]."));
    assert.equal(positionedMessages(fake).length, fake.lowerStatusLine().length, "every message gives the position");
    assertNoErrorLogged(fake);
});
