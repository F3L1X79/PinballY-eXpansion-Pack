// ============================================================
// The Rocket Game's entry follows the active Profile through main.js: it
// shows after Change Player only for a Profile that had the Rocket Easter
// Egg, right after that Easter Egg ends, and is gone after a Profile Reset.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { launchFromWheel, untilPlaying, untilCrash, SCORE_MS, LEAVING_MS, TABLES } from "../easter_eggs/rocket_scenario.js";
import { startRocketGame, mainMenuTitles, hadTheRocket } from "./rocket_game_scenario.js";

test("the entry shows for a Profile once its Rocket Easter Egg has ended, and goes with a Profile Reset", async () => {
    const { fake, lang, store } = await startRocketGame({ profiles: { Alice: {}, Bob: hadTheRocket }, active: "Alice", wins: "rocket" });
    const hasEntry = () => mainMenuTitles(fake).includes(lang.rocketGame.menuEntry);
    assert.equal(hasEntry(), false);
    store.switchTo("Bob");
    assert.equal(hasEntry(), true, "follows Change Player");
    store.switchTo("Alice");
    assert.equal(hasEntry(), false);

    launchFromWheel(fake, fake.getGameInfo(TABLES[0].configId));
    await untilPlaying(fake);
    assert.equal(hasEntry(), false, "not while the Easter Egg plays");
    untilCrash(fake, lang);
    fake.advanceTime(SCORE_MS + LEAVING_MS + 50);
    await settle();
    assert.equal(hasEntry(), true, "once it has ended, with no restart");

    store.resetProfile("Alice");
    assert.equal(hasEntry(), false, "gone after a Profile Reset");
    assertNoErrorLogged(fake);
});
