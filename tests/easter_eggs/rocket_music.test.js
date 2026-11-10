// ============================================================
// The Rocket's music: it loops from the opening word to the crash, on one
// player kept for the session, and starts again with the next game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import config from "../../common/core/config.js";
import {
    startRocketScenario, launchFromWheel, nextDayForAnotherProfile, untilPlaying, untilCrash, isRocketShown, MUSIC_FILE, SCORE_MS, LEAVING_MS, BACKDROP_PAINT_MS, TOAST_GONE_MS,
} from "./rocket_scenario.js";

test("the music loops from the opening word to the crash, and again at the next game", async () => {
    const { fake, lang, store, table } = await startRocketScenario();
    fake.addFile(MUSIC_FILE);
    config.rocketMusicFile = MUSIC_FILE;

    launchFromWheel(fake, table);
    await settle();
    fake.advanceTime(BACKDROP_PAINT_MS);
    assert.deepEqual(fake.loopingSoundsPlayed(), [MUSIC_FILE], "it starts with the opening word, set to loop");

    await untilPlaying(fake);
    fake.advanceTime(1000);
    assert.deepEqual(fake.soundsStopped(), [], "it plays through the game");

    untilCrash(fake, lang);
    assert.deepEqual(fake.soundsStopped(), [MUSIC_FILE], "the crash cuts it");
    fake.advanceTime(SCORE_MS + LEAVING_MS + 100);
    assert.equal(isRocketShown(fake), false, "the wheel is back");
    assert.deepEqual(fake.soundsStopped(), [MUSIC_FILE], "stopped once");

    // The Achievement's toast keeps the wheel busy, and the next draw away, until it goes.
    await settle();
    fake.advanceTime(TOAST_GONE_MS);
    await settle();
    nextDayForAnotherProfile(fake, store, "Alice");
    launchFromWheel(fake, table);
    await settle();
    fake.advanceTime(BACKDROP_PAINT_MS);
    assert.deepEqual(fake.loopingSoundsPlayed(), [MUSIC_FILE, MUSIC_FILE], "from the start again");
    const players = fake.soundPlayers().filter((_, index) => fake.soundsPlayed()[index] === MUSIC_FILE);
    assert.equal(new Set(players).size, 1, "on the same player");
    assertNoErrorLogged(fake);
});
