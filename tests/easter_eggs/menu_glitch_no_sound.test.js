// ============================================================
// The Menu Glitch's sound is missing: logged, and it plays silently.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startMenuGlitchScenario, shownGlitchLayers, glitchSounds, LEAD_IN_MS } from "./menu_glitch_scenario.js";

test("without its sound the Menu Glitch plays silently, and that is logged", async () => {
    const { fake } = await startMenuGlitchScenario({ files: [] });
    assert.ok(fake.logLines().some(line => line.startsWith("[MenuGlitch]") && line.includes("silently")), "known soon after startup");
    fake.openMainMenu();
    fake.advanceTime(LEAD_IN_MS + 100);
    assert.ok(shownGlitchLayers(fake).length > 0);
    assert.deepEqual(glitchSounds(fake), []);
    assertNoErrorLogged(fake);
});
