// ============================================================
// The Crow's call is missing: logged, and the Crow plays silently.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startCrowScenario, birds, calls, WING_IMAGES, DOT_IMAGE } from "./crow_scenario.js";

test("without its sound the Crow plays silently, and that is logged", async () => {
    const { fake } = await startCrowScenario({ addOns: [], startupScreen: "wheel", profiles: [], files: [...WING_IMAGES, DOT_IMAGE] });
    fake.advanceTime(100);
    assert.equal(birds(fake).length, 1);
    assert.deepEqual(calls(fake), []);
    assert.ok(fake.logLines().some(line => line.startsWith("[Crow]") && line.includes("silently")));
    assertNoErrorLogged(fake);
});
