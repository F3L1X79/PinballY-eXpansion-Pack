// ============================================================
// Discord Rich Presence through main.js, READY late: nothing but the
// handshake is sent before READY, even when a game starts meanwhile; then
// only the latest status, the game's.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { OPCODE } from "../support/fake_discord.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, POLL_MS, activitiesSent, startDiscordScenario } from "./discord_scenario.js";

test("nothing is sent before READY, then the latest status", async () => {
    const { fake, discord } = await startDiscordScenario({ discord: { holdReady: true } });
    fake.advanceTime(5 * POLL_MS);
    fake.playGame(MARS);
    fake.gameStarted(MARS);
    fake.advanceTime(5 * POLL_MS);

    assert.deepEqual(discord.frames().map(frame => frame.opcode), [OPCODE.HANDSHAKE], "the handshake alone");

    discord.sendReady();
    fake.advanceTime(POLL_MS);

    assert.deepEqual(activitiesSent(discord).map(activity => activity.details), ["Attack from Mars"]);
    assertNoErrorLogged(fake);
});
