// ============================================================
// Status Icons, through main.js, around attract mode: the status being
// cleared, the Discord icon fades out at its start and is back at its end.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { POLL_MS, startDiscordScenario } from "../discord/discord_scenario.js";
import { shownIcons, shownIconNames, DISCORD } from "./status_icons_reader.js";

const FADE_UNDER_WAY_MS = 3 * 16;
const FADE_OVER_MS = 300;

test("the Discord icon goes during attract mode and comes back at its end", async () => {
    const { fake } = await startDiscordScenario({ addOns: ["discordRichPresence", "statusIcons"] });
    fake.advanceTime(POLL_MS);
    assert.deepEqual(shownIconNames(fake), [DISCORD]);

    fake.enterAttractMode();
    fake.advanceTime(FADE_UNDER_WAY_MS);
    assert.ok(shownIcons(fake)[0].alpha < 0xFF, "fading out");
    fake.advanceTime(FADE_OVER_MS);
    assert.deepEqual(shownIconNames(fake), [], "gone");
    fake.advanceTime(60 * 60 * 1000);
    assert.deepEqual(shownIconNames(fake), [], "for as long as attract mode lasts");

    fake.exitAttractMode();
    assert.deepEqual(shownIconNames(fake), [DISCORD]);
    assert.equal(shownIcons(fake)[0].alpha, 0xFF, "back at once, the end of attract mode being a wheelmode");
    assertNoErrorLogged(fake);
});
