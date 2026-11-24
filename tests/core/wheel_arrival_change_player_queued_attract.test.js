// ============================================================
// The startup Welcome Screen left for Change Player, another Profile picked,
// then attract mode before the Welcome Screen that welcomes it had its turn:
// that screen is no longer the startup one, its Exit no Wheel Arrival.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, GLIDE_OVER_MS, isWelcomeScreenOpen, press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalScenario, chooseChangePlayer } from "./wheel_arrival_scenario.js";

test("attract mode before the Welcome Screen reopened by Change Player at startup opens ends the chain", async () => {
    const { fake, lang, store, arrivals } = await startWheelArrivalScenario();
    await chooseChangePlayer(fake, lang);
    press(fake, "Prev");
    fake.advanceTime(GLIDE_OVER_MS);
    press(fake, "Select");
    assert.equal(store.getActiveProfile().name, "Alice");
    assert.equal(isWelcomeScreenOpen(fake), false, "still waiting its turn");
    fake.fire("attractmodestart", {});
    fake.fire("attractmodeend", {});
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);

    assert.equal(isWelcomeScreenOpen(fake), true, "shown once attract mode ends");
    press(fake, "Exit");
    await settle();
    assert.equal(arrivals(), 0);
    assertNoErrorLogged(fake);
});
