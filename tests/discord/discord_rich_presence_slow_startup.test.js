// ============================================================
// Discord Rich Presence through main.js, without Discord, a player who
// lingers on the Startup Screen past the last try: the Warning Toast covers
// neither the Profile picker nor the Welcome Screen, and arrives soon after.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { PIPES_PER_TRY, TOAST_ARRIVAL_MS, TRY_GAP_MS, WARNING_CARD } from "./discord_scenario.js";
import { closeWelcomeScreen, reachWelcomeScreen, warningCardsDrawn } from "./discord_startup_screen_scenario.js";

test("the Warning Toast waits for the Startup Screen's end", async () => {
    const { fake, settle } = await reachWelcomeScreen(2 * TRY_GAP_MS + TOAST_ARRIVAL_MS);
    assert.equal(fake.pipeOpens().length, 3 * PIPES_PER_TRY, "the three tries are over");
    fake.advanceTime(TRY_GAP_MS);
    assert.deepEqual(warningCardsDrawn(fake), [], "the Startup Screen stays uncovered");

    closeWelcomeScreen(fake);
    await settle();
    fake.advanceTime(TOAST_ARRIVAL_MS);

    assert.deepEqual(warningCardsDrawn(fake), [WARNING_CARD]);
    fake.advanceTime(10 * TRY_GAP_MS);
    assert.deepEqual(warningCardsDrawn(fake), [WARNING_CARD], "never a second toast");
    assert.equal(fake.pipeOpens().length, 3 * PIPES_PER_TRY, "no fourth try");
    assertNoErrorLogged(fake);
});
