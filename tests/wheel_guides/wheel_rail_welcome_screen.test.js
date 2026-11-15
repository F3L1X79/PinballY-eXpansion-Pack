// ============================================================
// The Wheel Rail through main.js, starting on the Welcome Screen: in place
// under it however long it stays open, its 3 s starting once it closes.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, DEFAULT_ADD_ONS } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { WELCOME_SCREEN_OPEN_MS, isWelcomeScreenOpen, press } from "../welcome_screen/welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Wheel Rail's 3 s start once the startup Welcome Screen closes", async () => {
    const { fake } = await startWheelGuides({
        addOns: [...DEFAULT_ADD_ONS, "startupChoicePrompt"], settings: { startupScreen: "welcome" },
    });
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);
    fake.advanceTime(20000);
    assert.equal(shownRail(fake).pill, "A", "still in place under the Welcome Screen");

    press(fake, "Exit");
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    fake.advanceTime(2900);
    await settle();
    assert.equal(shownRail(fake).pill, "A", "a full 3 s after it closes");
    fake.advanceTime(1500);
    assert.equal(shownRail(fake), null, "then gone");
    assertNoErrorLogged(fake);
});
