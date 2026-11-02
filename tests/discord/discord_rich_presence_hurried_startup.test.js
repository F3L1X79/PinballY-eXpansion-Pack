// ============================================================
// Discord Rich Presence through main.js, without Discord, a hurried player
// who closes the Startup Screen before the second try: the tries go on, and
// the Warning Toast arrives right after the last one.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { PIPES_PER_TRY, TOAST_ARRIVAL_MS, TRY_GAP_MS, WARNING_CARD } from "./discord_scenario.js";
import { closeWelcomeScreen, reachWelcomeScreen, warningCardsDrawn } from "./discord_startup_screen_scenario.js";

const HURRIED_PICK_MS = 1000;

test("the Warning Toast follows the last try once the Startup Screen is closed", async () => {
    const { fake, settle } = await reachWelcomeScreen(HURRIED_PICK_MS);
    closeWelcomeScreen(fake);
    await settle();
    assert.deepEqual(warningCardsDrawn(fake), []);

    fake.advanceTime(2 * TRY_GAP_MS - HURRIED_PICK_MS + TOAST_ARRIVAL_MS);

    assert.equal(fake.pipeOpens().length, 3 * PIPES_PER_TRY);
    assert.deepEqual(warningCardsDrawn(fake), [WARNING_CARD]);
    assertNoErrorLogged(fake);
});
