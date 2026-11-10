// ============================================================
// Attract mode while the Maneki-neko is out removes it at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startManekiScenario, moveWheelTimes, catLayers, shownCat } from "./maneki_neko_scenario.js";

test("attract mode removes the cat at once", async () => {
    const { fake } = await startManekiScenario();
    moveWheelTimes(fake, 13);
    fake.advanceTime(500);
    assert.ok(shownCat(fake));

    fake.enterAttractMode();
    assert.deepEqual(catLayers(fake), []);
    assertNoErrorLogged(fake);
});
