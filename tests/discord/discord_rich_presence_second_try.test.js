// ============================================================
// Discord Rich Presence through main.js, Discord starting a little after
// PinballY: found on the second try, no Warning Toast, and a game started
// before the connection shows once READY is read.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { LOGO_URL, MARS, NOW, PIPES_PER_TRY, POLL_MS, TOAST_ARRIVAL_MS, TRY_GAP_MS, activitiesSent, startDiscordScenario, toastCardsDrawn } from "./discord_scenario.js";

const GAME_START_MS = 5000;
// The first try's pipes, then the first pipe of the second, where Discord is.
const PIPE_OPENS = PIPES_PER_TRY + 1;

test("Discord found on the second try gets the game already started, and no toast shows", async () => {
    const { fake } = await startDiscordScenario({ discord: null });

    fake.advanceTime(GAME_START_MS);
    fake.playGame(MARS);
    fake.gameStarted(MARS);
    const discord = fake.startDiscord();
    fake.advanceTime(TRY_GAP_MS - GAME_START_MS);
    fake.advanceTime(POLL_MS);

    assert.deepEqual(activitiesSent(discord), [
        { details: "Attack from Mars", timestamps: { start: NOW.getTime() + GAME_START_MS }, assets: { large_image: LOGO_URL } },
    ]);
    assert.equal(fake.pipeOpens().length, PIPE_OPENS);

    fake.gameOver(MARS);
    fake.advanceTime(3 * TRY_GAP_MS);
    assert.equal(fake.pipeOpens().length, PIPE_OPENS, "no more tries once connected");
    fake.advanceTime(TOAST_ARRIVAL_MS);
    assert.deepEqual(toastCardsDrawn(fake), []);
    assert.deepEqual(fake.logLines().filter(line => line.startsWith("[DiscordRichPresence]")), []);
    assertNoErrorLogged(fake);
});
