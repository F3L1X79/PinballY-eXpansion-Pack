// ============================================================
// A frame of the Menu Glitch fails: logged, the menu given back whole with
// its buttons, the table's sound back at once, nothing left drawn.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { isDrawnMenuShown, highlightedEntry, press } from "../drawn_menu/drawn_menu_reader.js";
import { startMenuGlitchScenario, glitchLayers, volumes, LEAD_IN_MS } from "./menu_glitch_scenario.js";

test("a failing frame gives the menu back", async () => {
    const { fake } = await startMenuGlitchScenario();
    const volumesBefore = volumes(fake).length;
    fake.openMainMenu();
    fake.advanceTime(LEAD_IN_MS - 1);
    fake.random = () => { throw new Error("a frame failed"); };
    fake.advanceTime(50);
    fake.random = () => 0.99;

    assert.deepEqual(glitchLayers(fake), [], "nothing left");
    assert.ok(isDrawnMenuShown(fake), "the menu is back");
    assert.deepEqual(volumes(fake).slice(volumesBefore), [0, 100], "the sound back at once, no climb");
    const firstEntry = highlightedEntry(fake);
    press(fake, "Next");
    assert.notEqual(highlightedEntry(fake), firstEntry, "its buttons too");
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes("[MenuGlitch]") && errors[0].includes("a frame failed"), errors[0]);
});
