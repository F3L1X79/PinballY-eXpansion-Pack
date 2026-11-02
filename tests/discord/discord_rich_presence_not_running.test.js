// ============================================================
// Discord Rich Presence through main.js, Discord not running: three tries
// 15 s apart over the ten pipes, then one plain log line and one Warning
// Toast, never an error, and nothing more tried during the session.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, PIPES_PER_TRY, TOAST_ARRIVAL_MS, TRY_GAP_MS, WARNING_CARD, playGame, startDiscordScenario, toastCardsDrawn } from "./discord_scenario.js";

const JUST_BEFORE_MS = 100;

test("without Discord, three tries 15 s apart, one log line, one Warning Toast, then nothing", async () => {
    const { fake } = await startDiscordScenario({ discord: null });
    assert.equal(fake.pipeOpens().length, PIPES_PER_TRY, "the first try, at startup");

    fake.advanceTime(TRY_GAP_MS - JUST_BEFORE_MS);
    assert.equal(fake.pipeOpens().length, PIPES_PER_TRY, "not before 15 s");
    fake.advanceTime(JUST_BEFORE_MS);
    assert.equal(fake.pipeOpens().length, 2 * PIPES_PER_TRY, "the second try");

    fake.advanceTime(TRY_GAP_MS - JUST_BEFORE_MS);
    assert.equal(fake.pipeOpens().length, 2 * PIPES_PER_TRY);
    assert.deepEqual(toastCardsDrawn(fake), [], "no toast before the last try fails");
    fake.advanceTime(JUST_BEFORE_MS);
    assert.equal(fake.pipeOpens().length, 3 * PIPES_PER_TRY, "the third try");

    fake.advanceTime(TOAST_ARRIVAL_MS);
    assert.deepEqual(toastCardsDrawn(fake), [WARNING_CARD]);

    fake.advanceTime(10 * 60 * 1000);
    await playGame(fake, MARS);

    assert.equal(fake.pipeOpens().length, 3 * PIPES_PER_TRY, "no fourth try");
    assert.deepEqual(toastCardsDrawn(fake), [WARNING_CARD], "never a second toast");
    assert.deepEqual(fake.logLines().filter(line => line.startsWith("[DiscordRichPresence]")),
        ["[DiscordRichPresence] Discord not found: start it before PinballY. Nothing shown on Discord until PinballY restarts."]);
    assert.equal(fake.runningIntervalCount(), 0, "no polling");
    assertNoErrorLogged(fake);
});
