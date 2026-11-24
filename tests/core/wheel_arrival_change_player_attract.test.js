// ============================================================
// Attract mode while the carousel opened by Change Player from the startup
// Welcome Screen is on show: no Wheel Arrival, nor at the Exit of a Welcome
// Screen reopened afterwards from the main menu.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { openFromMainMenu, press } from "../welcome_screen/welcome_screen_reader.js";
import { startWheelArrivalScenario, chooseChangePlayer } from "./wheel_arrival_scenario.js";

test("attract mode during Change Player at startup makes no Wheel Arrival", async () => {
    const { fake, lang, arrivals } = await startWheelArrivalScenario();
    await chooseChangePlayer(fake, lang);
    fake.fire("attractmodestart", {});
    fake.fire("attractmodeend", {});
    await settle();
    assert.equal(arrivals(), 0);

    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    press(fake, "Exit");
    await settle();
    assert.equal(arrivals(), 0);
    assertNoErrorLogged(fake);
});
