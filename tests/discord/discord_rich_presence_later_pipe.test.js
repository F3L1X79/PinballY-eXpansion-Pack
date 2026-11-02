// ============================================================
// Discord Rich Presence through main.js, Discord on a later pipe (a second
// client, or pipes taken by other programs): pipes 0 to 3 tried in order,
// the first that opens kept, the status sent there.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { POLL_MS, activitiesSent, startDiscordScenario } from "./discord_scenario.js";

test("the first Discord pipe that opens is kept", async () => {
    const { fake, discord } = await startDiscordScenario({ discord: { pipeNumber: 3 } });
    fake.advanceTime(POLL_MS);

    assert.deepEqual(fake.pipeOpens(), [0, 1, 2, 3].map(number => `\\\\?\\pipe\\discord-ipc-${number}`));
    assert.deepEqual(activitiesSent(discord).map(activity => activity.details), ["Choosing a table"]);
    assertNoErrorLogged(fake);
});
