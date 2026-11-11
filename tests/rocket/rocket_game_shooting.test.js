// ============================================================
// The Rocket Game's shooting through main.js: Launch fires one shot at a
// time up the ship's lane, a press during its flight fires nothing more,
// and a shot that breaks an asteroid shows its break-up and adds 5 points.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { ROCKET_IMAGES } from "../easter_eggs/rocket_scenario.js";
import {
    startRocketGame, chooseRocketGame, gameScore, gameImages, shownShots, scoreScreenLayerCount, INTRO_MS,
} from "./rocket_game_scenario.js";

const BREAK_UP_IMAGES = ROCKET_IMAGES.filter(path => /rocket_break_[2-5]\.png$/.test(path));

test("Launch fires one shot at a time, and a shot that breaks an asteroid adds 5 points", async () => {
    const { fake, lang } = await startRocketGame();
    await chooseRocketGame(fake, lang);
    fake.advanceTime(INTRO_MS + 16);
    assert.deepEqual(shownShots(fake), [], "no shot before a press");

    press(fake, "Launch");
    fake.advanceTime(48);
    assert.equal(shownShots(fake).length, 1, "a shot rises");
    const firstY = shownShots(fake)[0].position().y;
    press(fake, "Launch");
    press(fake, "Select");
    fake.advanceTime(48);
    assert.equal(shownShots(fake).length, 1, "one shot at a time");
    // PinballY's y points up.
    assert.ok(shownShots(fake)[0].position().y > firstY, "the same shot, still rising");

    let scores = [];
    let sawBreakUp = false;
    for (let elapsed = 0; elapsed < 60000 && scoreScreenLayerCount(fake) === 0; elapsed += 16) {
        if (elapsed % 160 === 0) press(fake, "Launch");
        fake.advanceTime(16);
        const score = gameScore(fake, lang);
        if (score !== null && score !== scores.at(-1)) scores.push(score);
        if (score !== null && score % 10 === 5) {
            sawBreakUp = gameImages(fake).some(image => BREAK_UP_IMAGES.includes(image));
            break;
        }
    }
    // A broken asteroid alone, or with a row passing in the same frame.
    const steps = scores.slice(1).map((score, index) => score - scores[index]);
    assert.ok(steps.some(step => step === 5 || step === 15), `a broken asteroid's 5 points among ${scores.join(", ")}`);
    assert.ok(sawBreakUp, "the asteroid breaks up");
    assertNoErrorLogged(fake);
});
