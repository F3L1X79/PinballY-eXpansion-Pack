// ============================================================
// A Welcome Screen reopened from the main menu: closing it plays no Wheel
// Arrival sound, the startup one having played it already.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isWelcomeScreenOpen, openFromMainMenu, press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalSoundScenario, arrivalSounds, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

test("closing a Welcome Screen reopened from the main menu plays no Wheel Arrival sound", async () => {
    const { fake, lang } = await startWheelArrivalSoundScenario();
    press(fake, "Exit");
    await settle();
    assert.equal(arrivalSounds(fake).length, 1);

    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    assert.equal(isWelcomeScreenOpen(fake), true);
    press(fake, "Exit");
    await settle();
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.equal(arrivalSounds(fake).length, 1, "still once");
    assertNoErrorLogged(fake);
});
