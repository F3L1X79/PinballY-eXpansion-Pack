// ============================================================
// Status Icons, through main.js, around attract mode: Discord showing
// "Attract mode" publicly, the Discord icon stays through it, never fading.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { POLL_MS, startDiscordScenario } from "../discord/discord_scenario.js";
import { shownIcons, shownIconNames, DISCORD } from "./status_icons_reader.js";

test("the Discord icon stays during attract mode and after it", async () => {
    const { fake } = await startDiscordScenario({ addOns: ["discordRichPresence", "statusIcons"] });
    fake.advanceTime(POLL_MS);
    assert.deepEqual(shownIconNames(fake), [DISCORD]);

    fake.enterAttractMode();
    fake.advanceTime(POLL_MS);
    assert.deepEqual(shownIconNames(fake), [DISCORD]);
    assert.equal(shownIcons(fake)[0].alpha, 0xFF, "never fading");
    fake.advanceTime(60 * 60 * 1000);
    assert.deepEqual(shownIconNames(fake), [DISCORD], "for as long as attract mode lasts");

    fake.exitAttractMode();
    assert.deepEqual(shownIconNames(fake), [DISCORD]);
    assert.equal(shownIcons(fake)[0].alpha, 0xFF);
    assertNoErrorLogged(fake);
});
