// ============================================================
// Status Icons, through main.js, with Discord Rich Presence off and Discord
// running: never public, so no icon, and the pipe is never touched.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { POLL_MS, startDiscordScenario } from "../discord/discord_scenario.js";
import { shownIconNames } from "./status_icons_reader.js";

test("no Discord icon with Discord Rich Presence off", async () => {
    const { fake } = await startDiscordScenario({ addOns: ["statusIcons"] });
    fake.advanceTime(5 * POLL_MS);

    assert.deepEqual(shownIconNames(fake), []);
    assert.equal(fake.pipeOpens().length, 0, "the pipe never touched");
    assertNoErrorLogged(fake);
});
