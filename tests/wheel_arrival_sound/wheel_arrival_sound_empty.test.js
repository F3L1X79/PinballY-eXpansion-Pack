// ============================================================
// WHEEL_ARRIVAL_SOUND_FILE left empty, its default: nothing played at the
// Wheel Arrival, and nothing logged, since no sound ships with the pack.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalSoundScenario, GREETING_SOUND, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

test("an empty Wheel Arrival sound setting plays and logs nothing", async () => {
    const { fake } = await startWheelArrivalSoundScenario({ soundFile: "" });
    press(fake, "Exit");
    await settle();
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.deepEqual(fake.soundsPlayed(), [GREETING_SOUND]);
    assert.deepEqual(fake.logLines().filter(line => line.includes("[WheelArrivalSound]")), []);
    assertNoErrorLogged(fake);
});
