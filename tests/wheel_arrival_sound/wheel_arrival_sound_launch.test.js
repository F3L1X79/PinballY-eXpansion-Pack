// ============================================================
// A launch from the startup Welcome Screen: no Wheel Arrival sound, neither
// then nor on the return from the game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, choose } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalSoundScenario, arrivalSounds, TABLE } from "./wheel_arrival_sound_scenario.js";

test("a launch from the startup Welcome Screen plays no Wheel Arrival sound, nor does the return", async () => {
    const { fake, lang } = await startWheelArrivalSoundScenario();
    choose(fake, lang.welcomeScreen.randomTable);
    await settle();
    assert.deepEqual(fake.launches().map(game => game.configId), [TABLE.configId]);

    fake.gameStarted(fake.getGameInfo(TABLE.configId));
    fake.gameOver(fake.getGameInfo(TABLE.configId));
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    await settle();
    assert.equal(arrivalSounds(fake).length, 0);
    assertNoErrorLogged(fake);
});
