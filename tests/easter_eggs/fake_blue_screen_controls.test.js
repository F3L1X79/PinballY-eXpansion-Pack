// ============================================================
// The Fake Blue Screen on the Drawn Screen controls, through main.js: from
// the moment the table falls silent, every press is swallowed, Exit and held
// buttons included, attract mode cannot start, and the buttons are the
// wheel's again after the cut.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { startBlueScreenScenario, playTable, isScreenShown, SILENCE_LEAD_MS, SCREEN_MS } from "./fake_blue_screen_scenario.js";

test("the Fake Blue Screen keeps every button and attract mode until its cut", async () => {
    const { fake, table } = await startBlueScreenScenario();
    let attractHeard = 0;
    fake.on("attractmodestart", () => { attractHeard++; });

    await playTable(fake, table);
    assert.ok(press(fake, "Exit").defaultPrevented, "Exit gives nothing up while the table falls silent");
    fake.advanceTime(SILENCE_LEAD_MS);
    assert.ok(isScreenShown(fake), "Exit gave nothing up");
    for (const button of ["Exit", "Select", "Launch"]) {
        assert.ok(fake.fire("commandbuttondown", { command: button, repeat: true }).defaultPrevented, `a held ${button} never reaches the wheel`);
        assert.ok(press(fake, button).defaultPrevented, `${button} never reaches the wheel`);
    }
    fake.enterAttractMode();
    assert.equal(fake.getFullUIMode().mode, "wheel");
    assert.equal(attractHeard, 0, "no later listener hears a start that never happens");
    assert.ok(isScreenShown(fake));

    fake.advanceTime(SCREEN_MS);
    await settle();
    assert.equal(isScreenShown(fake), false);
    assert.notEqual(press(fake, "Exit").defaultPrevented, true, "the buttons are the wheel's again");
    fake.enterAttractMode();
    assert.equal(attractHeard, 1, "attract mode starts again");
    assertNoErrorLogged(fake);
});
