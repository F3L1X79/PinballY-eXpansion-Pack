// ============================================================
// Discord Rich Presence through main.js, attract mode starting before READY
// is read: READY then brings "Attract mode", never a stale "Choosing a table".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { LOGO_URL, POLL_MS, activitiesSent, startDiscordScenario } from "./discord_scenario.js";

test("READY during attract mode sends Attract mode", async () => {
    const { fake, discord } = await startDiscordScenario({ discord: { holdReady: true } });
    fake.enterAttractMode();
    fake.advanceTime(POLL_MS);
    assert.deepEqual(discord.commands(), [], "nothing before READY");

    discord.sendReady();
    fake.advanceTime(POLL_MS);

    assert.deepEqual(activitiesSent(discord), [{ details: "Attract mode", assets: { large_image: LOGO_URL } }]);
    assertNoErrorLogged(fake);
});
