// ============================================================
// WHEEL_ARRIVAL_SOUND_FILE naming a file that is not there: one error line
// at startup, then the sound stays off and the startup goes on as usual.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { errorLines } from "../support/error_log.js";
import { isWelcomeScreenOpen, press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalSoundScenario, arrivalSounds, GREETING_SOUND, SETTLED_MS } from "./wheel_arrival_sound_scenario.js";

test("a missing Wheel Arrival sound file is logged once and leaves the startup as it is", async () => {
    const { fake } = await startWheelArrivalSoundScenario({ files: [GREETING_SOUND] });
    assert.equal(isWelcomeScreenOpen(fake), true, "the Welcome Screen opens all the same");
    press(fake, "Exit");
    await settle();
    fake.advanceTime(SETTLED_MS);
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.equal(arrivalSounds(fake).length, 0);

    const errors = errorLines(fake);
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /\[WheelArrivalSound\].*here-we-go\.mp3/);
});
