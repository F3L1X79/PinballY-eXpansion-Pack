// ============================================================
// The Wheel Arrival Sound Add-on turned off: nothing loaded, nothing played,
// even with the file set and found.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalSoundScenario, GREETING_SOUND, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

test("with its Add-on off, the Wheel Arrival sound is neither loaded nor played", async () => {
    const { fake } = await startWheelArrivalSoundScenario({ addOns: ["startupChoicePrompt", "profilePicker"] });
    press(fake, "Exit");
    await settle();
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.deepEqual(fake.soundsPlayed(), [GREETING_SOUND]);
    assert.deepEqual(fake.logLines().filter(line => line.includes("[WheelArrivalSound]")), []);
    assertNoErrorLogged(fake);
});
