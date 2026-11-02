// ============================================================
// Discord Rich Presence through main.js, DISCORD_APPLICATION_ID set in
// .env.local: its ID replaces the shipped one in the handshake.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { handshakes, startDiscordScenario } from "./discord_scenario.js";

test("discordApplicationId replaces the shipped Application ID", async () => {
    const { fake, discord } = await startDiscordScenario({ applicationId: "987654321098765432" });

    assert.deepEqual(handshakes(discord), [{ v: 1, client_id: "987654321098765432" }]);
    assertNoErrorLogged(fake);
});
