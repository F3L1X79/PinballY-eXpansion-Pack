// ============================================================
// Discord Rich Presence through main.js, attract mode: its start shows
// "Attract mode", its end brings "Choosing a table" back, and a game launched
// from it shows the table as usual.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { LOGO_URL, MARS, POLL_MS, activitiesSent, startDiscordScenario } from "./discord_scenario.js";

const CHOOSING = { details: "Choosing a table", assets: { large_image: LOGO_URL } };
const ATTRACT = { details: "Attract mode", assets: { large_image: LOGO_URL } };

const { fake, discord } = await startDiscordScenario();
fake.advanceTime(POLL_MS);

test("attract mode's start shows Attract mode, in one update", () => {
    const sentBefore = activitiesSent(discord).length;
    fake.enterAttractMode();
    fake.advanceTime(POLL_MS);

    assert.deepEqual(activitiesSent(discord).slice(sentBefore), [ATTRACT]);
});

test("the status stays unchanged for as long as attract mode lasts", () => {
    const sentBefore = activitiesSent(discord).length;
    fake.advanceTime(60 * 60 * 1000);

    assert.equal(activitiesSent(discord).length, sentBefore);
});

test("attract mode's end brings Choosing a table back, in one update", () => {
    const sentBefore = activitiesSent(discord).length;
    fake.exitAttractMode();
    fake.advanceTime(POLL_MS);

    assert.deepEqual(activitiesSent(discord).slice(sentBefore), [CHOOSING]);
});

test("a game launched after a button press ended attract mode shows the table", () => {
    fake.enterAttractMode();
    fake.exitAttractMode();
    fake.playGame(MARS);
    fake.gameStarted(MARS);
    fake.advanceTime(POLL_MS);

    assert.equal(activitiesSent(discord).at(-1).details, "Attack from Mars");
    fake.gameOver(MARS);
    fake.advanceTime(POLL_MS);
});

test("a game launched from attract mode shows the table as usual", () => {
    fake.enterAttractMode();
    fake.playGame(MARS);
    fake.gameStarted(MARS);
    fake.advanceTime(POLL_MS);

    assert.equal(activitiesSent(discord).at(-1).details, "Attack from Mars");
    assert.equal(typeof activitiesSent(discord).at(-1).timestamps.start, "number");
});

test("after that game, the wheel shows Choosing a table", () => {
    fake.gameOver(MARS);
    fake.advanceTime(POLL_MS);

    assert.deepEqual(activitiesSent(discord).at(-1), CHOOSING);
    assertNoErrorLogged(fake);
});
