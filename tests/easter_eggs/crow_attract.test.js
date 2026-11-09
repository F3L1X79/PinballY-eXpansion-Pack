// ============================================================
// Attract mode during the Crow's flight removes it at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, press } from "../welcome_screen/welcome_screen_reader.js";
import { startCrowScenario, birds, crowLayers } from "./crow_scenario.js";

test("attract mode removes the Crow at once", async () => {
    const { fake } = await startCrowScenario();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    press(fake, "Exit");
    await settle();
    fake.advanceTime(3000);
    assert.equal(birds(fake).length, 1);
    fake.enterAttractMode();
    assert.deepEqual(crowLayers(fake), []);
    assert.equal(fake.gameUpdates().at(-1).changes.audioVolume, 100);
    assertNoErrorLogged(fake);
});
