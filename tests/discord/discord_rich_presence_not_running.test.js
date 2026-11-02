// ============================================================
// Discord Rich Presence through main.js, Discord not running: the ten
// pipes are tried once at startup, one plain line is logged, never an
// error, and nothing more is tried during the session.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, playGame, startDiscordScenario } from "./discord_scenario.js";

test("without Discord, one try, one log line, then nothing", async () => {
    const { fake } = await startDiscordScenario({ discord: null });
    fake.advanceTime(10 * 60 * 1000);
    await playGame(fake, MARS);

    assert.equal(fake.pipeOpens().length, 10);
    assert.deepEqual(fake.logLines().filter(line => line.startsWith("[DiscordRichPresence]")),
        ["[DiscordRichPresence] Discord not found: start it before PinballY. Nothing shown on Discord until PinballY restarts."]);
    assert.equal(fake.runningIntervalCount(), 0, "no polling");
    assertNoErrorLogged(fake);
});
