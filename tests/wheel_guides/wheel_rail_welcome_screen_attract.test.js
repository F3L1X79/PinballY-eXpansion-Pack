// ============================================================
// The Wheel Rail through main.js, starting on the Welcome Screen that attract
// mode closes at once: back after attract mode, it leaves after its 3 s.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, DEFAULT_ADD_ONS } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { WELCOME_SCREEN_OPEN_MS, isWelcomeScreenOpen } from "../welcome_screen/welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("attract mode over the startup Welcome Screen leaves the Wheel Rail its 3 s afterwards", async () => {
    const { fake } = await startWheelGuides({
        addOns: [...DEFAULT_ADD_ONS, "startupChoicePrompt"], settings: { startupScreen: "welcome" },
    });
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    fake.enterAttractMode();
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.equal(shownRail(fake), null, "hidden in attract mode");

    fake.exitAttractMode();
    await settle();
    assert.equal(shownRail(fake).pill, "A");
    fake.advanceTime(2900);
    assert.equal(shownRail(fake).pill, "A", "a full 3 s after attract mode");
    fake.advanceTime(1000);
    assert.equal(shownRail(fake), null, "then gone, not kept by the closed Welcome Screen");
    assertNoErrorLogged(fake);
});
