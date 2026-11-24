// ============================================================
// The startup Welcome Screen left for Change Player, another Profile picked:
// the Wheel Arrival sound plays once, at the Exit of the Welcome Screen that
// welcomes it, and not before.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { choose, isWelcomeScreenOpen, pickProfileBeside, press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalSoundScenario, arrivalSounds, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

test("after Change Player at startup, the Wheel Arrival sound plays at the next Welcome Screen's Exit", async () => {
    const { fake, lang, store } = await startWheelArrivalSoundScenario();
    choose(fake, lang.profiles.menuEntry);
    await settle();
    assert.equal(arrivalSounds(fake).length, 0, "not on leaving for Change Player");

    await pickProfileBeside(fake, "Prev");
    assert.equal(store.getActiveProfile().name, "Alice");
    assert.equal(isWelcomeScreenOpen(fake), true);
    assert.equal(arrivalSounds(fake).length, 0, "not before that Welcome Screen closes");

    press(fake, "Exit");
    await settle();
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.equal(arrivalSounds(fake).length, 1);
    assertNoErrorLogged(fake);
});
