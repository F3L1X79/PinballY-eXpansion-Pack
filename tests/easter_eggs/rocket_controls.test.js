// ============================================================
// The Rocket on the Drawn Screen controls, through main.js: from the
// cancelled launch on, every press is swallowed and only a flipper acts,
// during the game itself; Exit gives nothing up, even while it gets ready;
// attract mode cannot start; the buttons are the wheel's again at the end.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startRocketScenario, launchFromWheel, untilPlaying, untilCrash, isRocketShown, shipLayer, SCORE_MS, LEAVING_MS,
} from "./rocket_scenario.js";

test("the Rocket keeps every button and attract mode until it ends, and only a flipper acts", async () => {
    const { fake, lang, table } = await startRocketScenario();
    let attractHeard = 0;
    fake.on("attractmodestart", () => { attractHeard++; });

    launchFromWheel(fake, table);
    // Getting ready: Exit gives nothing up.
    for (const button of ["Exit", "Next", "Select"]) assert.ok(press(fake, button).defaultPrevented, `${button} is swallowed while getting ready`);
    await untilPlaying(fake);
    assert.ok(isRocketShown(fake), "Exit gave nothing up");
    const startX = shipLayer(fake).position().x;
    for (const button of ["Exit", "Select", "Launch"]) {
        assert.ok(fake.fire("commandbuttondown", { command: button, repeat: true }).defaultPrevented, `a held ${button} never reaches the wheel`);
        assert.ok(press(fake, button).defaultPrevented, `${button} never reaches the wheel`);
    }
    fake.fire("commandbuttondown", { command: "Prev", repeat: true });
    fake.advanceTime(100);
    assert.equal(shipLayer(fake).position().x, startX, "nothing but a flipper's press moves the ship, never its repeat");
    press(fake, "Prev");
    fake.advanceTime(100);
    assert.ok(shipLayer(fake).position().x < startX, "a flipper does");

    fake.enterAttractMode();
    assert.equal(fake.getFullUIMode().mode, "wheel");
    assert.equal(attractHeard, 0, "no later listener hears a start that never happens");

    untilCrash(fake, lang);
    fake.advanceTime(SCORE_MS + LEAVING_MS + 50);
    await settle();
    assert.equal(isRocketShown(fake), false);
    assert.notEqual(press(fake, "Exit").defaultPrevented, true, "the buttons are the wheel's again");
    fake.enterAttractMode();
    assert.equal(attractHeard, 1, "attract mode starts again");
    assertNoErrorLogged(fake);
});
