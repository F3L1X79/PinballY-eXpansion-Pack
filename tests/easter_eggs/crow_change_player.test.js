// ============================================================
// The startup Welcome Screen left for Change Player: no Crow over the
// carousel nor over the Welcome Screen that welcomes the Profile picked; it
// flies at that screen's Exit, the Wheel Arrival.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, choose, press, isWelcomeScreenOpen, pickProfileBeside } from "../welcome_screen/welcome_screen_reader.js";
import { startCrowScenario, crowLayers, birds } from "./crow_scenario.js";

test("the Crow flies at the Exit of the Welcome Screen reopened by Change Player at startup", async () => {
    const { fake, lang, store } = await startCrowScenario();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    choose(fake, lang.profiles.menuEntry);
    await settle();
    assert.deepEqual(crowLayers(fake), [], "the carousel is open");

    await pickProfileBeside(fake, "Prev");
    assert.equal(store.getActiveProfile().name, "Alice");
    assert.equal(isWelcomeScreenOpen(fake), true, "reopened for the new Profile");
    assert.deepEqual(crowLayers(fake), [], "not over the Welcome Screen");

    press(fake, "Exit");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(birds(fake).length, 1, "flying once the Welcome Screen closed");
    assertNoErrorLogged(fake);
});
