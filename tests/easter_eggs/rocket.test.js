// ============================================================
// The Rocket through main.js: a launch from the wheel turns into the game,
// with no table launched and no other listener left waiting for a
// "postlaunch"; the word, the silent table, the flippers, the crash, the
// score for 2 s, the sound back before the backdrop goes, and the toast on
// the wheel. Recorded at the start, never twice.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startRocketScenario, launchFromWheel, untilPlaying, untilCrash, isRocketShown, rocketLayers, shownTexts, shownImages, shipLayer, finalScore,
    volumeWrites, profileFile, SPLASH_IMAGE, NAVIGATION_SOUND, SCORE_MS, LEAVING_MS, BACKDROP_PAINT_MS,
} from "./rocket_scenario.js";

test("a launch from the wheel turns into the Rocket until the crash, then the wheel is back with the table not launched", async () => {
    const { fake, lang, store, table } = await startRocketScenario();
    const title = lang.achievements.unauthorizedTakeoffTitle();
    const hasToast = () => toastDrawings(fake).some(drawing => drawing.texts.includes(title));
    let heardByLaterListener = false;
    fake.on("prelaunch", () => { heardByLaterListener = true; });

    launchFromWheel(fake, table);
    assert.deepEqual(fake.launches(), [], "no table launched");
    assert.equal(heardByLaterListener, false, "no later listener hears the cancelled launch");
    assert.ok(fake.mediaWindows().every(window => !window.isVisible()), "the Backglass Clock never shows");
    assert.equal(JSON.parse(fake.readFile(profileFile("guest"))).surprises.easterEggs.rocket, true, "recorded at the start");

    await settle();
    fake.advanceTime(BACKDROP_PAINT_MS);
    assert.ok(shownImages(fake).includes(SPLASH_IMAGE), "the opening's rays");
    assert.ok(shownTexts(fake).includes(lang.rocket.dodge), "the word slammed on the screen");
    assert.deepEqual(volumeWrites(fake, table), [0], "the table silent behind the backdrop");
    assert.deepEqual(layersBreakingTheRule(fake), []);

    await untilPlaying(fake);
    assert.equal(shownImages(fake).includes(SPLASH_IMAGE), false, "the opening is over");
    assert.ok(shownTexts(fake).includes(`${lang.rocket.score}  0`), "the score at the top");
    const startX = shipLayer(fake).position().x;
    press(fake, "Next");
    fake.advanceTime(100);
    assert.ok(shipLayer(fake).position().x > startX, "a flipper moves the ship one lane");
    assert.ok(fake.soundsPlayed().includes(NAVIGATION_SOUND), "with the navigation sound");
    for (const button of ["Exit", "Select", "Launch"]) assert.ok(press(fake, button).defaultPrevented, `${button} never reaches the wheel`);
    fake.enterAttractMode();
    assert.equal(fake.getFullUIMode().mode, "wheel", "attract mode cannot start");
    assert.ok(isRocketShown(fake), "only the crash ends the game");
    assert.equal(hasToast(), false, "no toast under the game");
    assert.deepEqual(layersBreakingTheRule(fake), []);

    untilCrash(fake, lang);
    assert.notEqual(finalScore(fake, lang), null, "the score panel after the crash");
    fake.advanceTime(SCORE_MS - 50);
    assert.ok(isRocketShown(fake), "for 2 s");
    fake.advanceTime(100);
    assert.deepEqual(volumeWrites(fake, table), [0, 80], "the table's sound back first");
    assert.ok(isRocketShown(fake), "under the backdrop");
    fake.advanceTime(LEAVING_MS);
    assert.equal(isRocketShown(fake), false, "then the backdrop goes");
    assert.equal(rocketLayers(fake).length, 0, "every layer removed");
    await settle();
    assert.equal(hasToast(), true, "its toast back on the wheel");
    assert.equal(store.getNotifiedOf("guest").includes("unauthorizedTakeoff"), true);

    // The wheel is healthy: its buttons, and a launch that really launches now.
    assert.notEqual(press(fake, "Next").defaultPrevented, true, "the buttons are the wheel's again");
    assert.deepEqual(fake.launches(), []);
    launchFromWheel(fake, table);
    assert.deepEqual(fake.launches(), [table], "never twice for a Profile");
    assertNoErrorLogged(fake);
});
