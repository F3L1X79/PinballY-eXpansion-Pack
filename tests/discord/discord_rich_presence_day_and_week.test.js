// ============================================================
// Discord Rich Presence through main.js, a table both the Table of the Day
// and the Table of the Week: the Day wins.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, POLL_MS, activitiesSent, startDiscordScenario } from "./discord_scenario.js";

test("a table that is both says Table of the Day", async () => {
    const { fake, discord } = await startDiscordScenario({ dayTable: MARS, weekTable: MARS });
    fake.advanceTime(POLL_MS);
    fake.playGame(MARS);
    fake.gameStarted(MARS);
    fake.advanceTime(POLL_MS);

    assert.equal(activitiesSent(discord).at(-1).state, "Table of the Day");
    assertNoErrorLogged(fake);
});
