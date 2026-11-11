// ============================================================
// A game played by the Rocket Easter Egg, with the Rocket Game on, through
// main.js: never saved among the Profile's Rocket Game scores.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startRocketScenario, launchFromWheel, untilPlaying, untilCrash, isRocketShown, finalScore, profileFile, SCORE_MS, LEAVING_MS,
} from "../easter_eggs/rocket_scenario.js";

test("a game played by the Easter Egg is never recorded as a Rocket Game score", async () => {
    const { fake, lang, table } = await startRocketScenario({ addOns: ["rocketGame"] });
    launchFromWheel(fake, table);
    await untilPlaying(fake);
    untilCrash(fake, lang);
    assert.notEqual(finalScore(fake, lang), null);
    fake.advanceTime(SCORE_MS + LEAVING_MS + 100);
    await settle();
    assert.equal(isRocketShown(fake), false, "back on the wheel");
    assert.equal("rocketScores" in JSON.parse(fake.readFile(profileFile("guest"))), false);
    assertNoErrorLogged(fake);
});
