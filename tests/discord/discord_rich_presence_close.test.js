// ============================================================
// Discord Rich Presence through main.js, a CLOSE frame from Discord: the
// connection ends with one plain log line giving its code, the pipe closed.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { POLL_MS, startDiscordScenario } from "./discord_scenario.js";

test("a CLOSE frame ends the connection for the session", async () => {
    const { fake, discord } = await startDiscordScenario();
    fake.advanceTime(POLL_MS);
    discord.close(4000, "Invalid Client ID");
    fake.advanceTime(POLL_MS);

    assert.deepEqual(fake.logLines().filter(line => line.startsWith("[DiscordRichPresence]")),
        [`[DiscordRichPresence] Connection to Discord lost: Discord closed the connection ({"code":4000,"message":"Invalid Client ID"}). Nothing shown on Discord until PinballY restarts.`]);
    assert.equal(discord.isConnected(), false, "the pipe closed");
    assert.equal(fake.runningIntervalCount(), 0, "no polling left");
    assertNoErrorLogged(fake);
});
