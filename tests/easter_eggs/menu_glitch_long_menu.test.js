// ============================================================
// A main menu longer than its panel: the Menu Glitch only corrupts entries
// in view, so the Profile's name backwards always shows.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startMenuGlitchScenario, allGlitchTexts } from "./menu_glitch_scenario.js";

const ENTRY_COUNT = 60;

test("the name backwards is on an entry in view, in a menu that scrolls", async () => {
    const { fake } = await startMenuGlitchScenario();
    fake.openMenu("main", Array.from({ length: ENTRY_COUNT }, (_, index) => ({ title: `Entry ${index}`, cmd: globalThis.command.PlayGame })));
    assert.ok(allGlitchTexts(fake).includes("ECILA"));
    assertNoErrorLogged(fake);
});
