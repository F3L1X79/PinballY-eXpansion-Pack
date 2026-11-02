// ============================================================
// Discord Rich Presence through main.js, the state line: the Table of the
// Day and the Table of the Week say so while played, any other table says
// nothing, and the wheel's "Choosing a table" never carries it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, MEDIEVAL, PLAYBOY, POLL_MS, activitiesSent, startDiscordScenario } from "./discord_scenario.js";

const { fake, discord } = await startDiscordScenario({ dayTable: MARS, weekTable: MEDIEVAL });
fake.advanceTime(POLL_MS);

// The game's activity, read while it runs; the game then ends.
function activityDuringGameOf(table) {
    fake.playGame(table);
    fake.gameStarted(table);
    fake.advanceTime(POLL_MS);
    const activity = activitiesSent(discord).at(-1);
    fake.gameOver(table);
    fake.advanceTime(POLL_MS);
    return activity;
}

test("the Table of the Day says so", () => {
    const activity = activityDuringGameOf(MARS);

    assert.equal(activity.details, "Attack from Mars");
    assert.equal(activity.state, "Table of the Day");
});

test("back on the wheel, the status no longer says so", () => {
    assert.equal(activitiesSent(discord).at(-1).details, "Choosing a table");
    assert.equal("state" in activitiesSent(discord).at(-1), false);
});

test("the Table of the Week says so", () => {
    const activity = activityDuringGameOf(MEDIEVAL);

    assert.equal(activity.details, "Medieval Madness");
    assert.equal(activity.state, "Table of the Week");
});

test("another table has no state", () => {
    const activity = activityDuringGameOf(PLAYBOY);

    assert.equal(activity.details, "Playboy");
    assert.equal("state" in activity, false);
    assertNoErrorLogged(fake);
});
