// ============================================================
// A Fake Blue Screen whose drawing fails is logged once and gives the wheel
// back at once: the table's sound, no layer left, the buttons; its
// Achievement still counted, since it was won.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { errorLines } from "../support/error_log.js";
import { whileDrawsFail, FAILING_DRAW_MESSAGE } from "../support/failing_draws.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { startBlueScreenScenario, screenLayers, volumeWrites } from "./fake_blue_screen_scenario.js";

test("a failing drawing ends the Fake Blue Screen by itself", async () => {
    const { fake, store, table } = await startBlueScreenScenario();
    fake.playGame(table);
    fake.gameStarted(table);
    fake.gameOver(table);
    // The tick after the game, where it is drawn.
    await whileDrawsFail(() => settle());
    assert.deepEqual(volumeWrites(fake, table), [0, 80], "the table's sound back");
    assert.deepEqual(screenLayers(fake), [], "no layer left");
    assert.notEqual(press(fake, "Next").defaultPrevented, true, "the buttons are the wheel's again");
    await settle();
    const errors = errorLines(fake);
    assert.equal(errors.length, 1, "logged once");
    assert.ok(errors[0].includes(FAILING_DRAW_MESSAGE));
    assert.equal(store.getNotifiedOf("guest").includes("kernelPanic"), true, "won all the same");
});
