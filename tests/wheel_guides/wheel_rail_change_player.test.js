// ============================================================
// The Wheel Rail through main.js, starting on the Welcome Screen left for
// Change Player: in place under the carousel and the Welcome Screen that
// welcomes the Profile picked, its 3 s starting at that screen's Exit.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, DEFAULT_ADD_ONS } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { WELCOME_SCREEN_OPEN_MS, choose, isWelcomeScreenOpen, press, pickProfileBeside } from "../welcome_screen/welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Wheel Rail's 3 s start at the Wheel Arrival after Change Player", async () => {
    const { fake, lang } = await startWheelGuides({
        addOns: [...DEFAULT_ADD_ONS, "startupChoicePrompt", "profilePicker"],
        profiles: { Alice: {}, Bob: {} }, active: "Bob", settings: { startupScreen: "welcome" },
    });
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    choose(fake, lang.profiles.menuEntry);
    await settle();
    await pickProfileBeside(fake, "Prev");
    assert.equal(isWelcomeScreenOpen(fake), true, "reopened for Alice");
    fake.advanceTime(5000);
    assert.equal(shownRail(fake).pill, "A", "still in place under the Welcome Screen");

    press(fake, "Exit");
    await settle();
    fake.advanceTime(2900);
    await settle();
    assert.equal(shownRail(fake).pill, "A", "a full 3 s after it closes");
    fake.advanceTime(1500);
    assert.equal(shownRail(fake), null, "then gone");
    assertNoErrorLogged(fake);
});
