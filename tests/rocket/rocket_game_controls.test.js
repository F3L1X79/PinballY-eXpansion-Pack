// ============================================================
// The Rocket Game's score screen on the Drawn Screen controls, through
// main.js: opening (every press swallowed, attract mode held off), Exit
// closing it, a held Select, Launch or Exit ignored, and Exit while it gets
// ready giving it up; each time the main menu comes back on the entry.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readLoader, loaderLayerCount } from "../support/loader_reader.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startRocketGame, chooseRocketGame, isGameShown, gameLayerCount, isScoreScreenShown, scoreScreenLayerCount, untilCrash,
    reopenedMainMenuSelection, LEAVING_MS, SCORE_SCREEN_OPEN_MS,
} from "./rocket_game_scenario.js";

const DRAW_MS = 400;

test("the score screen keeps the buttons and attract mode, closes on Exit, and gives up on Exit while getting ready", async () => {
    const { fake, lang } = await startRocketGame();
    const entry = lang.rocketGame.menuEntry;
    let attractHeard = 0;
    fake.on("attractmodestart", () => { attractHeard++; });
    const assertBackOnTheEntry = async (why) => {
        fake.advanceTime(LEAVING_MS + 50);
        await settle();
        assert.equal(scoreScreenLayerCount(fake), 0, why);
        assert.equal(gameLayerCount(fake), 0, why);
        assert.equal(fake.executedCommands().at(-1), globalThis.command.ShowMainMenu, why);
        assert.deepEqual(reopenedMainMenuSelection(fake), [entry], why);
    };

    await chooseRocketGame(fake, lang);
    untilCrash(fake, lang);
    fake.advanceTime(SCORE_SCREEN_OPEN_MS);
    assert.ok(isScoreScreenShown(fake));
    for (const button of ["Select", "Launch", "Exit"]) {
        assert.ok(fake.fire("commandbuttondown", { command: button, repeat: true }).defaultPrevented, `a held ${button} never reaches the wheel`);
    }
    assert.ok(isScoreScreenShown(fake), "a held button closes nothing");
    fake.enterAttractMode();
    assert.equal(attractHeard, 0, "attract mode held off");
    assert.ok(isScoreScreenShown(fake));
    assert.ok(press(fake, "Exit").defaultPrevented);
    await assertBackOnTheEntry("closed by Exit");

    await chooseRocketGame(fake, lang);
    fake.setDrawMs(DRAW_MS);
    untilCrash(fake, lang);
    fake.advanceTime(200);
    assert.equal(readLoader(fake).shown, true, "getting ready");
    assert.ok(press(fake, "Select").defaultPrevented);
    assert.equal(isScoreScreenShown(fake), false);
    press(fake, "Exit");
    fake.setDrawMs(0);
    fake.advanceTime(2000);
    assert.equal(loaderLayerCount(fake), 0);
    assert.equal(isGameShown(fake), false);
    await assertBackOnTheEntry("given up while getting ready");

    fake.enterAttractMode();
    assert.equal(attractHeard, 1, "attract mode free again");
    assertNoErrorLogged(fake);
});
