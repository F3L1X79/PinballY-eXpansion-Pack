// ============================================================
// The Wheel Rail through main.js with WHEEL_RAIL_SECONDS=2.5: not a whole
// number of seconds, so the default 3 s apply and the fallback is logged once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("a WHEEL_RAIL_SECONDS that is not a whole number of seconds falls back to 3 s, logged", async () => {
    const { fake } = await startWheelGuides({ settings: { wheelRailSeconds: 2.5 } });
    fake.moveWheel(1);
    fake.advanceTime(2900);
    assert.equal(shownRail(fake).pill, "B", "still there after 2.9 s: not 2.5 s");
    fake.advanceTime(1000);
    assert.equal(shownRail(fake), null, "gone after 3 s and the slide");
    const fallbacks = fake.logLines().filter(line => line.includes("wheelRailSeconds"));
    assert.equal(fallbacks.length, 1);
    assert.match(fallbacks[0], /2\.5.*using 3/);
    assertNoErrorLogged(fake);
});
