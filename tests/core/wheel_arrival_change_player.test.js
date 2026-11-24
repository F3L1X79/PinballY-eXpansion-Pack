// ============================================================
// The startup Welcome Screen left for Change Player, another Profile picked:
// the Welcome Screen that welcomes it is the startup one, and its Exit is
// the Wheel Arrival, once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isWelcomeScreenOpen, press, pickProfileBeside } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalScenario, chooseChangePlayer } from "./wheel_arrival_scenario.js";

test("the Wheel Arrival comes at the Exit of the Welcome Screen that welcomes the Profile picked by Change Player", async () => {
    const { fake, lang, store, arrivals } = await startWheelArrivalScenario();
    await chooseChangePlayer(fake, lang);
    assert.equal(arrivals(), 0, "not while the carousel is open");

    await pickProfileBeside(fake, "Prev");
    assert.equal(store.getActiveProfile().name, "Alice");
    assert.equal(isWelcomeScreenOpen(fake), true);
    assert.equal(arrivals(), 0, "not before that Welcome Screen closes");

    press(fake, "Exit");
    await settle();
    assert.equal(arrivals(), 1);
    assertNoErrorLogged(fake);
});
