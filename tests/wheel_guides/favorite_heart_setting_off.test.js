// ============================================================
// FAVORITE_HEART=false through main.js, the Wheel Guides on: no Favorite
// Heart layer, the Wheel Position still there.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, heartLayers, shownPosition } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with FAVORITE_HEART=false, no Favorite Heart", async () => {
    const { fake } = await startWheelGuides({ settings: { favoriteHeart: false } });
    fake.moveWheel(1);
    fake.fire("wheelmode");

    assert.deepEqual(heartLayers(fake), []);
    assert.equal(shownPosition(fake), "2/5", "the Wheel Position still shows");
    assertNoErrorLogged(fake);
});
