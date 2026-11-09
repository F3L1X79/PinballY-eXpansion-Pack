// ============================================================
// The Crow through main.js: it crosses the wheel when the startup Welcome
// Screen closes, with its call and dots, the table silent for the call, the
// wheel usable, its Achievement's toast once it has gone; never again when
// the Welcome Screen is reopened.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { WELCOME_SCREEN_OPEN_MS, press, isWelcomeScreenOpen, openFromMainMenu } from "../welcome_screen/welcome_screen_reader.js";
import {
    startCrowScenario, birds, dots, crowLayers, calls, profileFile, DAILY_FILE, FLIGHT_MS, CALL_MS, ALL_GONE_MS, TOAST_LIFE_MS,
} from "./crow_scenario.js";

const NEAR = 0.02;
const A_FRAME_MS = 20;
// The fake host's window.
const LAYOUT = { width: 1920, height: 1080 };

test("the Crow crosses the wheel once, when the startup Welcome Screen closes", async () => {
    const { fake, lang, store } = await startCrowScenario();
    const title = lang.achievements.corvusExMachinaTitle();
    const hasToast = () => toastDrawings(fake).some(drawing => drawing.texts.includes(title));
    const volumes = () => fake.gameUpdates().map(update => update.changes.audioVolume);

    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);
    assert.deepEqual(birds(fake), [], "not over the Welcome Screen");

    press(fake, "Exit");
    await settle();
    const startMs = fake.now().getTime();
    const untilElapsed = ms => fake.advanceTime(ms - (fake.now().getTime() - startMs));
    assert.deepEqual(volumes(), [50, 0], "the table goes silent, without rising between the screens");
    assert.equal(calls(fake).length, 1, "the call starts with the flight");
    assert.equal(JSON.parse(fake.readFile(profileFile("Bob"))).surprises.easterEggs.crow, true, "recorded before it plays");
    assert.equal(JSON.parse(fake.readFile(DAILY_FILE)).day, "2026-11-09");
    assert.deepEqual(layersBreakingTheRule(fake), []);

    untilElapsed(FLIGHT_MS / 2);
    assert.equal(birds(fake).length, 1, "one pose at a time");
    const [bird] = birds(fake);
    assert.ok(Math.abs(bird.position().x) < NEAR, "halfway across at half the flight");
    const birdWidth = bird.scale().ySpan * LAYOUT.height * bird.canvasSize().width / bird.canvasSize().height;
    assert.ok(Math.abs(birdWidth / LAYOUT.width - 0.2) < NEAR, "a fifth of the window's width");
    assert.ok(Math.abs(0.5 - bird.position().y - 0.33) < 0.03, "a third of the way down, give or take the glide");
    assert.equal(dots(fake).length, 6, "the dots its tail has passed");
    assert.deepEqual(layersBreakingTheRule(fake), []);
    const event = press(fake, "Next");
    assert.notEqual(event.defaultPrevented, true, "the wheel stays usable");
    assert.equal(hasToast(), false, "no toast during the flight");

    untilElapsed(FLIGHT_MS + A_FRAME_MS);
    assert.deepEqual(birds(fake), [], "the bird has left");
    assert.deepEqual(volumes(), [50, 0], "still silent for the call");
    untilElapsed(CALL_MS + 50);
    assert.deepEqual(volumes(), [50, 0, 100], "back in one update when the call ends");
    assert.ok(dots(fake).length > 0, "whatever the dots are doing");
    assert.equal(hasToast(), false, "no toast while something of it remains");

    untilElapsed(ALL_GONE_MS);
    assert.deepEqual(crowLayers(fake), [], "nothing left");
    await settle();
    assert.equal(hasToast(), true, "its toast once it has gone");
    assert.equal(store.getNotifiedOf("Bob").includes("corvusExMachina"), true);

    fake.advanceTime(TOAST_LIFE_MS);
    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    assert.equal(isWelcomeScreenOpen(fake), true);
    press(fake, "Exit");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.deepEqual(birds(fake), [], "never for a reopened Welcome Screen, even forced");
    assert.equal(calls(fake).length, 1);
    assertNoErrorLogged(fake);
});
