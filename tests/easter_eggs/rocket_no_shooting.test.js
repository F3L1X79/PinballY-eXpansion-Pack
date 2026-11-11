// ============================================================
// The Rocket Easter Egg never shoots: Select and Launch, pressed all game
// long, fire nothing, and the score only grows by whole rows of 10.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { startRocketScenario, launchFromWheel, untilPlaying, rocketLayers, shownTexts, finalScore } from "./rocket_scenario.js";
import { SHOT_Z_INDEX } from "../rocket/rocket_game_scenario.js";

test("Select and Launch never shoot in the Rocket Easter Egg", async () => {
    const { fake, lang, table } = await startRocketScenario();
    launchFromWheel(fake, table);
    await untilPlaying(fake);

    const scores = new Set();
    let sawShot = false;
    for (let elapsed = 0; elapsed < 120000 && finalScore(fake, lang) === null; elapsed += 16) {
        if (elapsed % 160 === 0) press(fake, elapsed % 320 === 0 ? "Launch" : "Select");
        fake.advanceTime(16);
        sawShot ||= rocketLayers(fake).some(layer => layer.zIndex === SHOT_Z_INDEX && layer.alpha > 0);
        const line = shownTexts(fake).find(text => text.startsWith(`${lang.rocket.score}  `));
        if (line !== undefined) scores.add(Number(line.slice(lang.rocket.score.length + 2)));
    }
    assert.notEqual(finalScore(fake, lang), null, "the game crashed");
    assert.equal(sawShot, false, "no shot");
    assert.deepEqual([...scores].filter(score => score % 10 !== 0), [], "only whole rows scored");
    assert.equal(Number(finalScore(fake, lang)) % 10, 0);
    assertNoErrorLogged(fake);
});
