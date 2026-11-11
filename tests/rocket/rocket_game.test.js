// ============================================================
// The Rocket Game through main.js: its entry right after the Random Game,
// only for a Profile that has had the Rocket Easter Egg; the intro naming
// the flippers and Launch for 3.5 s; the game; the score screen with the score just
// made and the Rocket Board, closed by a button; the main menu back on the entry; the score saved.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { sectionHolding } from "../support/main_menu_reader.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startRocketGame, mainMenuTitles, chooseRocketGame, isGameShown, gameTexts, gameLayerCount, isScoreScreenShown, scoreScreenTexts,
    scoreScreenLayerCount, boardLines, untilCrash, reopenedMainMenuSelection, hadTheRocket, profileFile, INTRO_MS, LEAVING_MS, SCORE_SCREEN_OPEN_MS,
} from "./rocket_game_scenario.js";

test("a Profile that had the Rocket plays it from the main menu, sees its score, and lands back on the entry", async () => {
    const { fake, lang, store } = await startRocketGame({ profiles: { Alice: hadTheRocket, Bob: {} }, active: "Bob", addOns: ["rocketGame", "randomGame"] });
    const entry = lang.rocketGame.menuEntry;
    assert.equal(mainMenuTitles(fake).includes(entry), false, "hidden from a Profile that never had the Easter Egg");

    store.switchTo("Alice");
    assert.deepEqual(sectionHolding(mainMenuTitles(fake), entry), ["Play", lang.customMenuLabels.randomTable, entry], "right after the Random Game");

    await chooseRocketGame(fake, lang);
    assert.ok(gameTexts(fake).includes(lang.rocket.dodge), "the Easter Egg's word");
    assert.ok(gameTexts(fake).includes(lang.rocketGame.changeLane), "the commands at the bottom");
    assert.ok(gameTexts(fake).includes(lang.rocketGame.shoot), "Launch shoots, under the flippers' line");
    fake.advanceTime(INTRO_MS - 100);
    assert.ok(gameTexts(fake).includes(lang.rocketGame.changeLane), "held 3.5 s");
    fake.advanceTime(200);
    assert.equal(gameTexts(fake).includes(lang.rocketGame.changeLane), false);
    assert.ok(gameTexts(fake).includes(`${lang.rocket.score}  0`), "the game itself");

    const score = untilCrash(fake, lang);
    fake.advanceTime(SCORE_SCREEN_OPEN_MS);
    assert.ok(isScoreScreenShown(fake), "the score screen over the crash");
    assert.deepEqual(scoreScreenTexts(fake), [lang.rocketGame.yourScore, String(score)]);
    assert.deepEqual(boardLines(fake), [{ place: "1", name: "Alice", score: String(score), isHighlighted: true }], "the Rocket Board under it");
    assert.equal(gameTexts(fake).includes(lang.rocket.score), false, "no 2 s panel under it");
    fake.advanceTime(5000);
    assert.ok(isScoreScreenShown(fake), "until a button");

    assert.ok(press(fake, "Select").defaultPrevented);
    await settle();
    assert.equal(scoreScreenLayerCount(fake), 0, "gone at once");
    fake.advanceTime(LEAVING_MS + 50);
    await settle();
    assert.equal(isGameShown(fake), false);
    assert.equal(gameLayerCount(fake), 0);
    assert.equal(fake.executedCommands().at(-1), globalThis.command.ShowMainMenu, "the main menu reopens");
    assert.deepEqual(reopenedMainMenuSelection(fake), [entry], "on the entry");
    assert.deepEqual(JSON.parse(fake.readFile(profileFile("Alice"))).rocketScores.map(saved => saved.score), [score], "the score saved");
    assertNoErrorLogged(fake);
});
