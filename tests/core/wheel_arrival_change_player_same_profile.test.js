// ============================================================
// The startup Welcome Screen left for Change Player, the active Profile
// picked again: no Welcome Screen follows, so the carousel's close is the
// Wheel Arrival, once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, isWelcomeScreenOpen, press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalScenario, chooseChangePlayer } from "./wheel_arrival_scenario.js";

test("the Wheel Arrival comes when Change Player closes on the active Profile", async () => {
    const { fake, lang, store, arrivals } = await startWheelArrivalScenario();
    await chooseChangePlayer(fake, lang);
    assert.equal(arrivals(), 0);

    press(fake, "Select");
    await settle();
    assert.equal(store.getActiveProfile().name, "Bob");
    assert.equal(arrivals(), 1);
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.equal(arrivals(), 1);
    assertNoErrorLogged(fake);
});
