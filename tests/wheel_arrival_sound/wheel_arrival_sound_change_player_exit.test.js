// ============================================================
// The startup Welcome Screen left for Change Player, the carousel left on
// Exit: the Wheel Arrival sound plays once, at the carousel's close.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { choose, press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalSoundScenario, arrivalSounds, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

test("after Change Player at startup, leaving the carousel on Exit plays the Wheel Arrival sound once", async () => {
    const { fake, lang } = await startWheelArrivalSoundScenario();
    choose(fake, lang.profiles.menuEntry);
    await settle();
    assert.equal(arrivalSounds(fake).length, 0);

    press(fake, "Exit");
    await settle();
    assert.equal(arrivalSounds(fake).length, 1);
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.equal(arrivalSounds(fake).length, 1, "once");
    assertNoErrorLogged(fake);
});
