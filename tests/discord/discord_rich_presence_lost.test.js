// ============================================================
// Discord Rich Presence through main.js, a command answered with evt
// "ERROR": the connection ends for the session, with one plain log line,
// one Warning Toast back on the wheel, the pipe closed, no polling left,
// nothing sent afterwards.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, POLL_MS, TOAST_ARRIVAL_MS, WARNING_CARD, activitiesSent, startDiscordScenario, toastCardsDrawn } from "./discord_scenario.js";

const discordLines = fake => fake.logLines().filter(line => line.startsWith("[DiscordRichPresence]"));

const { fake, discord } = await startDiscordScenario();
fake.advanceTime(POLL_MS);

test("an evt ERROR reply ends the connection, the pipe closed", () => {
    discord.errorNextCommand();
    fake.playGame(MARS);
    fake.gameStarted(MARS);
    fake.advanceTime(POLL_MS);

    assert.deepEqual(discordLines(fake),
        ["[DiscordRichPresence] Connection to Discord lost: Discord refused SET_ACTIVITY (4000: Invalid Payload). Nothing shown on Discord until PinballY restarts."]);
    assert.equal(discord.isConnected(), false, "the pipe closed");
    assert.equal(fake.runningIntervalCount(), 0, "no polling left");
    assert.deepEqual(toastCardsDrawn(fake), [], "the toast waits for the game's end");
});

test("nothing is sent once the connection is lost, and one Warning Toast shows on the wheel", () => {
    const sentBefore = activitiesSent(discord).length;
    fake.gameOver(MARS);
    fake.advanceTime(TOAST_ARRIVAL_MS);
    assert.deepEqual(toastCardsDrawn(fake), [WARNING_CARD]);
    fake.advanceTime(10 * POLL_MS);

    assert.equal(activitiesSent(discord).length, sentBefore);
    assert.equal(fake.pipeOpens().length, 1, "no new try");
    assert.deepEqual(toastCardsDrawn(fake), [WARNING_CARD], "never a second toast");
    assertNoErrorLogged(fake);
});
