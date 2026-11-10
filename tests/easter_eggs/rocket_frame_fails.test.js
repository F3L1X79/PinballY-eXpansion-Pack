// ============================================================
// A frame of the Rocket that fails is logged once and gives the wheel back:
// the table's sound, the layers gone, the buttons, and its Achievement still
// counted since it was won at the start.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { errorLines } from "../support/error_log.js";
import { whileDrawsFail, FAILING_DRAW_MESSAGE } from "../support/failing_draws.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { startRocketScenario, launchFromWheel, untilPlaying, rocketLayers, volumeWrites, LEAVING_MS } from "./rocket_scenario.js";

test("a failing frame gives the wheel back, its sound and its buttons", async () => {
    const { fake, store, table } = await startRocketScenario();
    launchFromWheel(fake, table);
    await untilPlaying(fake);
    // The score is drawn again when the first row passes the ship.
    whileDrawsFail(() => fake.advanceTime(5000));
    assert.deepEqual(volumeWrites(fake, table), [0, 80], "the table's sound back");
    fake.advanceTime(LEAVING_MS);
    await settle();
    assert.equal(rocketLayers(fake).length, 0, "every layer removed");
    assert.notEqual(press(fake, "Next").defaultPrevented, true, "the buttons are the wheel's again");
    assert.equal(fake.getFullUIMode().mode, "wheel");
    const errors = errorLines(fake);
    assert.equal(errors.length, 1, "logged once");
    assert.ok(errors[0].includes(FAILING_DRAW_MESSAGE));
    assert.equal(store.getNotifiedOf("guest").includes("unauthorizedTakeoff"), true, "won at the start");
});
