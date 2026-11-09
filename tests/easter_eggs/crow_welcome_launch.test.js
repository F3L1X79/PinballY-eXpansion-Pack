// ============================================================
// A startup Welcome Screen that closes on a launch draws no Crow, nor does
// the Welcome Screen reopened after that game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, choose, press, openFromMainMenu } from "../welcome_screen/welcome_screen_reader.js";
import { startCrowScenario, crowLayers, calls, TABLE } from "./crow_scenario.js";

test("no Crow when the startup Welcome Screen closes on a launch, nor afterwards", async () => {
    const { fake, lang } = await startCrowScenario();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    choose(fake, lang.welcomeScreen.randomTable);
    await settle();
    assert.deepEqual(crowLayers(fake), []);

    fake.gameStarted(fake.getGameInfo(TABLE.configId));
    fake.gameOver(fake.getGameInfo(TABLE.configId));
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    press(fake, "Exit");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.deepEqual(crowLayers(fake), []);
    assert.deepEqual(calls(fake), []);
    assertNoErrorLogged(fake);
});
