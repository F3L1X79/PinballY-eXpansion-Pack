// ============================================================
// With the Rocket Game Add-on off, through main.js: a Profile that had the
// Rocket Easter Egg finds the main menu as before, with no entry.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { sectionHolding } from "../support/main_menu_reader.js";
import { startRocketGame, mainMenuTitles } from "./rocket_game_scenario.js";

test("with the Add-on off the main menu has no Rocket Game entry", async () => {
    const { fake, lang } = await startRocketGame({ addOns: ["randomGame"] });
    const titles = mainMenuTitles(fake);
    assert.equal(titles.includes(lang.rocketGame.menuEntry), false);
    assert.deepEqual(sectionHolding(titles, "Play"), ["Play", lang.customMenuLabels.randomTable]);
    assertNoErrorLogged(fake);
});
