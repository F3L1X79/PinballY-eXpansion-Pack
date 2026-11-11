// ============================================================
// How a Rocket Game ends, through main.js: Exit during the intro or the game
// gives it up, with no score screen, nothing saved and the main menu back on the entry; a
// score screen left alone closes after 10 s, a held flipper's repeat never
// closing it, and leads to the main menu on the entry.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startRocketGame, chooseRocketGame, isGameShown, gameLayerCount, isScoreScreenShown, scoreScreenLayerCount, untilCrash,
    reopenedMainMenuSelection, profileFile, INTRO_MS, LEAVING_MS, SCORE_SCREEN_OPEN_MS, CLOSE_AFTER_MS,
} from "./rocket_game_scenario.js";

test("Exit gives a Rocket Game up; a score screen left alone closes after 10 s", async () => {
    const { fake, lang } = await startRocketGame();
    const entry = lang.rocketGame.menuEntry;
    const savedBefore = fake.readFile(profileFile("guest"));
    const assertBackOnTheEntry = (why) => {
        assert.equal(isGameShown(fake), false, why);
        assert.equal(gameLayerCount(fake), 0, why);
        assert.equal(scoreScreenLayerCount(fake), 0, `no score screen: ${why}`);
        assert.equal(fake.executedCommands().at(-1), globalThis.command.ShowMainMenu, why);
        assert.deepEqual(reopenedMainMenuSelection(fake), [entry], why);
    };

    for (const [why, waitMs] of [["during the intro", 500], ["during the game", INTRO_MS + 1000]]) {
        await chooseRocketGame(fake, lang);
        fake.advanceTime(waitMs);
        assert.ok(isGameShown(fake));
        assert.ok(press(fake, "Exit").defaultPrevented);
        fake.advanceTime(LEAVING_MS + 50);
        await settle();
        assertBackOnTheEntry(why);
        assert.equal(fake.readFile(profileFile("guest")), savedBefore, `nothing saved: ${why}`);
    }

    await chooseRocketGame(fake, lang);
    untilCrash(fake, lang);
    let waitedMs = 0;
    for (; !isScoreScreenShown(fake) && waitedMs < SCORE_SCREEN_OPEN_MS; waitedMs += 16) fake.advanceTime(16);
    assert.ok(isScoreScreenShown(fake));
    for (const flipper of ["Prev", "Next"]) fake.fire("commandbuttondown", { command: flipper, repeat: true });
    assert.ok(isScoreScreenShown(fake), "a held flipper's repeat never closes it");
    fake.advanceTime(CLOSE_AFTER_MS - 300);
    assert.ok(isScoreScreenShown(fake));
    fake.advanceTime(300 + LEAVING_MS + 50);
    await settle();
    assertBackOnTheEntry("after 10 s");
    assertNoErrorLogged(fake);
});
