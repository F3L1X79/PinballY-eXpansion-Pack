// ============================================================
// The Startup Screen is the bare wheel, with no Profile Greeting: no Wheel
// Arrival, so no sound, even with the file set and found.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startWheelArrivalSoundScenario, arrivalSounds, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

test("the bare wheel with no Profile Greeting plays no Wheel Arrival sound", async () => {
    const { fake } = await startWheelArrivalSoundScenario({ addOns: ["wheelArrivalSound"], startupScreen: "wheel", profiles: [] });
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.equal(arrivalSounds(fake).length, 0);
    assertNoErrorLogged(fake);
});
