// ============================================================
// The startup Profile picker with the Welcome Screen off: the Wheel Arrival
// sound plays once the Profile Greeting has ended, not while its own sound plays.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";
import { startWheelArrivalSoundScenario, arrivalSounds, playersOf, ARRIVAL_SOUND, GREETING_SOUND, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

const DURING_GREETING_MS = 1200;
const GREETING_OVER_MS = 1200;

test("with the Welcome Screen off, the end of the Profile Greeting plays the Wheel Arrival sound once", async () => {
    const { fake } = await startWheelArrivalSoundScenario({ addOns: ["profilePicker", "wheelArrivalSound"], startupScreen: "profilePicker" });
    fake.advanceTime(CAROUSEL_OPEN_MS);
    press(fake, "Select");
    await settle();
    fake.advanceTime(DURING_GREETING_MS);
    assert.equal(playersOf(fake, GREETING_SOUND).length, 1, "the Profile is greeted");
    assert.equal(arrivalSounds(fake).length, 0, "not during the greeting");

    fake.advanceTime(GREETING_OVER_MS);
    await settle();
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.equal(arrivalSounds(fake).length, 1);
    assert.notEqual(playersOf(fake, ARRIVAL_SOUND)[0], playersOf(fake, GREETING_SOUND)[0]);
    assertNoErrorLogged(fake);
});
