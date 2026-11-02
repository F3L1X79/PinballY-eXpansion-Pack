// ============================================================
// Discord Rich Presence through main.js, Discord on its first pipe: the
// handshake with the shipped Application ID, "Choosing a table" once READY,
// the table and its start during a game, "Choosing a table" back on the
// wheel; PING answered by PONG; the READY's user never logged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { FAKE_PINBALLY_PID } from "../support/fake_pinbally_host.js";
import { DISCORD_USER, OPCODE } from "../support/fake_discord.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { LOGO_URL, MARS, NOW, POLL_MS, SHIPPED_APPLICATION_ID, activitiesSent, handshakes, startDiscordScenario } from "./discord_scenario.js";

const CHOOSING = { details: "Choosing a table", assets: { large_image: LOGO_URL } };

const { fake, discord } = await startDiscordScenario();

test("the pack connects to Discord's first pipe with the shipped Application ID", () => {
    assert.deepEqual(fake.pipeOpens(), ["\\\\?\\pipe\\discord-ipc-0"]);
    assert.deepEqual(handshakes(discord), [{ v: 1, client_id: SHIPPED_APPLICATION_ID }]);
});

test("once READY is read, Discord shows Choosing a table", () => {
    fake.advanceTime(POLL_MS);

    assert.deepEqual(activitiesSent(discord), [CHOOSING]);
    const [command] = discord.commands();
    assert.equal(command.args.pid, FAKE_PINBALLY_PID);
    assert.equal(typeof command.nonce, "string");
});

test("during a game, Discord shows the table and its start", () => {
    fake.playGame(MARS);
    fake.advanceTime(3000);
    const startMs = NOW.getTime() + POLL_MS + 3000;
    fake.gameStarted(MARS);
    fake.advanceTime(POLL_MS);

    assert.deepEqual(activitiesSent(discord).at(-1), { details: "Attack from Mars", timestamps: { start: startMs }, assets: { large_image: LOGO_URL } });
    assert.equal(discord.commands().at(-1).args.pid, FAKE_PINBALLY_PID);
});

test("back on the wheel, Discord shows Choosing a table again", () => {
    fake.advanceTime(10 * 60 * 1000);
    fake.gameOver(MARS);
    fake.advanceTime(POLL_MS);

    assert.equal(activitiesSent(discord).length, 3, "one activity per moment, none at each poll");
    assert.deepEqual(activitiesSent(discord).at(-1), CHOOSING);
});

test("a PING from Discord is answered by a PONG with its payload", () => {
    discord.ping({ nonce: "ping-7" });
    fake.advanceTime(POLL_MS);

    const pongs = discord.frames().filter(frame => frame.opcode === OPCODE.PONG);
    assert.deepEqual(pongs.map(frame => frame.payload), [{ nonce: "ping-7" }]);
    assert.equal(discord.isConnected(), true);
});

test("the READY's user is never logged", () => {
    const log = fake.logLines().join("\n");
    assert.ok(!log.includes(DISCORD_USER.username) && !log.includes(DISCORD_USER.id), log);
    assertNoErrorLogged(fake);
});
