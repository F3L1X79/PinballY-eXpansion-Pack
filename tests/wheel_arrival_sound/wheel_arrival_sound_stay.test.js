// ============================================================
// Stay on the startup Welcome Screen: the Wheel Arrival sound plays once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { choose, readChoices } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalSoundScenario, arrivalSounds, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

test("Stay on the startup Welcome Screen plays the Wheel Arrival sound once", async () => {
    const { fake, lang } = await startWheelArrivalSoundScenario();
    const stay = readChoices(fake).find(label => label.startsWith(lang.welcomeScreen.stayOn("")));
    assert.ok(stay, "a Stay choice is offered");

    choose(fake, stay);
    await settle();
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.equal(arrivalSounds(fake).length, 1);
    assertNoErrorLogged(fake);
});
