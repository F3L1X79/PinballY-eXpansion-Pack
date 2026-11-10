// ============================================================
// Attract mode closes the main menu during the Menu Glitch: nothing stays
// drawn and the table's sound is back at once, with no climb.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isDrawnMenuShown } from "../drawn_menu/drawn_menu_reader.js";
import { startMenuGlitchScenario, glitchLayers, volumes, LEAD_IN_MS } from "./menu_glitch_scenario.js";

test("attract mode ends the Menu Glitch at once", async () => {
    const { fake } = await startMenuGlitchScenario();
    const volumesBefore = volumes(fake).length;
    fake.openMainMenu();
    fake.advanceTime(LEAD_IN_MS + 500);
    fake.fire("attractmodestart", {});

    assert.deepEqual(glitchLayers(fake), []);
    assert.ok(!isDrawnMenuShown(fake));
    assert.deepEqual(volumes(fake).slice(volumesBefore), [0, 100]);
    fake.advanceTime(5000);
    assert.deepEqual(volumes(fake).slice(volumesBefore), [0, 100], "no climb after");
    assertNoErrorLogged(fake);
});
