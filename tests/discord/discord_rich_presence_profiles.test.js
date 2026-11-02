// ============================================================
// Discord Rich Presence through main.js, never a Profile's name: a Child
// Profile's game shows only the table; an adult's Adult Table shows its
// name like any other table.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, PLAYBOY, POLL_MS, activitiesSent, everythingSent, playGame, startDiscordScenario } from "./discord_scenario.js";

const { fake, discord, profileStore } = await startDiscordScenario({
    profiles: { Alice: {}, Kid: { isChild: true } },
});
fake.advanceTime(POLL_MS);

test("a Child Profile's game shows the table, never the Profile", async () => {
    profileStore.switchTo("Kid");
    fake.playGame(MARS);
    fake.gameStarted(MARS);
    fake.advanceTime(POLL_MS);

    assert.equal(activitiesSent(discord).at(-1).details, "Attack from Mars");
    assert.deepEqual(Object.keys(activitiesSent(discord).at(-1)).sort(), ["assets", "details", "timestamps"]);
    fake.gameOver(MARS);
    fake.advanceTime(POLL_MS);
});

test("an adult's Adult Table shows its name", async () => {
    profileStore.switchTo("Alice");
    await playGame(fake, PLAYBOY);

    assert.deepEqual(activitiesSent(discord).map(activity => activity.details),
        ["Choosing a table", "Attack from Mars", "Choosing a table", "Playboy", "Choosing a table"]);
});

test("no Profile name is ever sent", () => {
    const sent = everythingSent(discord);
    for (const name of ["Kid", "Alice", "Guest"]) assert.ok(!sent.includes(name), `${name} in ${sent}`);
    assertNoErrorLogged(fake);
});
