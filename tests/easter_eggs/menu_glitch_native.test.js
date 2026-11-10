// ============================================================
// Drawn Menus off: a native main menu gets no Menu Glitch, even forced, and
// no Easter Egg is spent on it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startMenuGlitchScenario, glitchLayers, glitchSounds, volumes, profileFile } from "./menu_glitch_scenario.js";

test("a native main menu gets no Menu Glitch", async () => {
    const { fake } = await startMenuGlitchScenario({ addOns: [] });
    const volumesBefore = volumes(fake).length;
    fake.openMainMenu();
    assert.notEqual(fake.currentMenu(), null, "the native menu shows");
    fake.advanceTime(1000);
    assert.deepEqual(glitchLayers(fake), []);
    assert.deepEqual(glitchSounds(fake), []);
    assert.equal(volumes(fake).length, volumesBefore);
    assert.ok(!(fake.readFile(profileFile("Alice")) || "").includes("menuGlitch"), "no Easter Egg spent");
    assertNoErrorLogged(fake);
});
