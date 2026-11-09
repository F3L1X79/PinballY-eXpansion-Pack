// ============================================================
// The startup Profile picker with the Welcome Screen off: the Crow waits
// for the Profile Greeting to end, which would cover it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";
import { startCrowScenario, birds, calls } from "./crow_scenario.js";

const DURING_GREETING_MS = 1200;
const GREETING_OVER_MS = 1200;

test("the Crow flies once the startup Profile Greeting has ended", async () => {
    const { fake } = await startCrowScenario({ addOns: ["profilePicker"], startupScreen: "profilePicker" });
    fake.advanceTime(CAROUSEL_OPEN_MS);
    press(fake, "Select");
    await settle();
    fake.advanceTime(DURING_GREETING_MS);
    assert.deepEqual(calls(fake), [], "not during the greeting");
    fake.advanceTime(GREETING_OVER_MS);
    await settle();
    fake.advanceTime(100);
    assert.equal(birds(fake).length, 1);
    assert.equal(calls(fake).length, 1);
    assertNoErrorLogged(fake);
});
