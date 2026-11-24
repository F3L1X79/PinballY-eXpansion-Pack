// ============================================================
// Exit on the startup Welcome Screen: the Wheel Arrival sound plays once,
// on a player of its own, never the one-off player that the Profile
// Greeting's and the Achievement Toasts' sounds share.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalSoundScenario, arrivalSounds, playersOf, ARRIVAL_SOUND, GREETING_SOUND, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

test("Exit on the startup Welcome Screen plays the Wheel Arrival sound once, on its own player", async () => {
    const { fake } = await startWheelArrivalSoundScenario();
    assert.equal(arrivalSounds(fake).length, 0, "not while the screen is open");
    assert.equal(playersOf(fake, GREETING_SOUND).length, 1, "the screen greeted the Profile");

    press(fake, "Exit");
    await settle();
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.equal(arrivalSounds(fake).length, 1);
    assert.notEqual(playersOf(fake, ARRIVAL_SOUND)[0], playersOf(fake, GREETING_SOUND)[0]);
    assertNoErrorLogged(fake);
});
