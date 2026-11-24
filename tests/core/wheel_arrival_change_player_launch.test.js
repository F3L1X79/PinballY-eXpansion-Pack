// ============================================================
// The startup Welcome Screen left for Change Player, another Profile picked,
// then a Random Game launched from the Welcome Screen that welcomes it: no
// Wheel Arrival, nor after the game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, choose, pickProfileBeside } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalScenario, chooseChangePlayer, TABLE } from "./wheel_arrival_scenario.js";

test("a launch from the Welcome Screen reopened by Change Player at startup makes no Wheel Arrival", async () => {
    const { fake, lang, store, arrivals } = await startWheelArrivalScenario();
    await chooseChangePlayer(fake, lang);
    await pickProfileBeside(fake, "Prev");
    assert.equal(store.getActiveProfile().name, "Alice");
    choose(fake, lang.welcomeScreen.randomTable);
    await settle();
    assert.deepEqual(fake.launches().map(game => game.configId), [TABLE.configId]);
    assert.equal(arrivals(), 0);

    fake.gameStarted(fake.getGameInfo(TABLE.configId));
    fake.gameOver(fake.getGameInfo(TABLE.configId));
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(arrivals(), 0);
    assertNoErrorLogged(fake);
});
