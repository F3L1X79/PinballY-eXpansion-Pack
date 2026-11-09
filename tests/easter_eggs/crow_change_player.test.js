// ============================================================
// The startup Welcome Screen left for Change Player draws no Crow: the
// carousel opens over the wheel, and the Welcome Screen that follows the
// pick is a reopened one.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, choose, press, isWelcomeScreenOpen } from "../welcome_screen/welcome_screen_reader.js";
import { startCrowScenario, crowLayers } from "./crow_scenario.js";

const GLIDE_OVER_MS = 500;

test("no Crow when the startup Welcome Screen is left for Change Player", async () => {
    const { fake, lang, store } = await startCrowScenario();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    choose(fake, lang.profiles.menuEntry);
    await settle();
    assert.deepEqual(crowLayers(fake), [], "the carousel is open");

    press(fake, "Prev");
    fake.advanceTime(GLIDE_OVER_MS);
    press(fake, "Select");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(store.getActiveProfile().name, "Alice");
    assert.equal(isWelcomeScreenOpen(fake), true, "reopened for the new Profile");
    press(fake, "Exit");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.deepEqual(crowLayers(fake), []);
    assertNoErrorLogged(fake);
});
