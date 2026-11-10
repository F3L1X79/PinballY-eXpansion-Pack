// ============================================================
// The Rocket's music is missing: logged once, and every game plays silently.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import config from "../../common/core/config.js";
import { startRocketScenario, launchFromWheel, nextDayForAnotherProfile, untilPlaying, untilCrash, isRocketShown, MUSIC_FILE, SCORE_MS, LEAVING_MS, TOAST_GONE_MS } from "./rocket_scenario.js";

test("without its music the Rocket plays silently, and that is logged once", async () => {
    const { fake, lang, store, table } = await startRocketScenario();
    config.rocketMusicFile = MUSIC_FILE;
    const musicLines = () => fake.logLines().filter(line => line.startsWith("[Rocket]") && line.includes("silently"));

    for (let game = 0; game < 2; game++) {
        if (game > 0) nextDayForAnotherProfile(fake, store, "Alice");
        launchFromWheel(fake, table);
        await untilPlaying(fake);
        assert.ok(isRocketShown(fake), `game ${game + 1} plays`);
        untilCrash(fake, lang);
        fake.advanceTime(SCORE_MS + LEAVING_MS + 100);
        // The Achievement's toast keeps the wheel busy, and the next draw away, until it goes.
        await settle();
        fake.advanceTime(TOAST_GONE_MS);
        await settle();
    }
    assert.deepEqual(fake.loopingSoundsPlayed(), []);
    assert.equal(musicLines().length, 1);
    assertNoErrorLogged(fake);
});
