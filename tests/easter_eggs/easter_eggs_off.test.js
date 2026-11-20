// ============================================================
// The Easter Eggs turned off (ADD_ON_EASTER_EGGS=false) through main.js:
// the Rocket's draw is won, yet a launch from the wheel launches the table,
// no Rocket shows and nothing is recorded; a Profile that already had the
// Rocket keeps its Rocket Game entry and its Surprises Achievement.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startRocketScenario, launchFromWheel, untilPlaying, rocketLayers } from "./rocket_scenario.js";
import { mainMenuTitles, hadTheRocket } from "../rocket/rocket_game_scenario.js";

test("with the Easter Eggs off, a won draw shows nothing and a launch runs normally; what was earned stays", async () => {
    const { fake, lang, store, table } = await startRocketScenario({
        easterEggs: false, addOns: ["rocketGame", "achievements", "sessionStatsTracker"], profiles: { Bob: hadTheRocket },
    });
    const { getEasterEggRules, EASTER_EGG } = await import("../../common/easter_eggs/easter_egg_rules.js");
    const { getAllAchievements } = await import("../../addons/achievements_engine.js");
    const isTakeoffUnlocked = () => getAllAchievements().find(achievement => achievement.id === "unauthorizedTakeoff").checkUnlocked();
    const hasEntry = () => mainMenuTitles(fake).includes(lang.rocketGame.menuEntry);

    launchFromWheel(fake, table);
    assert.deepEqual(fake.launches(), [table], "the table is launched");
    await untilPlaying(fake);
    assert.deepEqual(rocketLayers(fake), [], "no Rocket");
    assert.equal(getEasterEggRules().hasPlayed(EASTER_EGG.ROCKET), false, "nothing recorded for Guest");
    assert.equal(isTakeoffUnlocked(), false);
    assert.equal(hasEntry(), false, "no entry for Guest");

    store.switchTo("Bob");
    await settle();
    assert.equal(hasEntry(), true, "Bob keeps the Rocket Game entry");
    assert.equal(isTakeoffUnlocked(), true, "and the Surprises Achievement");
    assertNoErrorLogged(fake);
});
