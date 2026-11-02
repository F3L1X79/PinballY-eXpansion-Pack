// ============================================================
// Discord Rich Presence through main.js, Discord quitting mid-session:
// its pipe gone, the connection ends with one plain log line, no polling
// left, and no new try.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, POLL_MS, playGame, startDiscordScenario } from "./discord_scenario.js";

test("a pipe gone ends the connection for the session", async () => {
    const { fake, discord } = await startDiscordScenario();
    fake.advanceTime(POLL_MS);
    discord.disappear();
    fake.advanceTime(POLL_MS);
    await playGame(fake, MARS);

    assert.deepEqual(fake.logLines().filter(line => line.startsWith("[DiscordRichPresence]")),
        ["[DiscordRichPresence] Connection to Discord lost: the pipe is gone. Nothing shown on Discord until PinballY restarts."]);
    assert.equal(fake.openPipeHandleCount(), 0, "the handle closed");
    assert.equal(fake.runningIntervalCount(), 0, "no polling left");
    assert.equal(fake.pipeOpens().length, 1, "no new try");
    assertNoErrorLogged(fake);
});
