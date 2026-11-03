// ============================================================
// Status Icons, through main.js, Discord quitting while the wheel is shown:
// the Discord icon fades out once and stays gone, the Warning Toast saying why.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { POLL_MS, TOAST_ARRIVAL_MS, WARNING_CARD, startDiscordScenario, toastCardsDrawn } from "../discord/discord_scenario.js";
import { shownIcons, shownIconNames, DISCORD } from "./status_icons_reader.js";

// The client reads the pipe every 250 ms: the symbol's fade is just under way.
const JUST_READ_MS = 250 + 3 * 16;
const FADE_OVER_MS = 300;

test("the Discord icon fades out when the pipe disappears", async () => {
    const { fake, discord } = await startDiscordScenario({ addOns: ["discordRichPresence", "statusIcons"] });
    fake.advanceTime(POLL_MS);
    assert.deepEqual(shownIconNames(fake), [DISCORD]);

    discord.disappear();
    fake.advanceTime(JUST_READ_MS);
    const [icon] = shownIcons(fake);
    assert.ok(icon.alpha > 0 && icon.alpha < 0xFF, `fading out (alpha ${icon.alpha})`);

    fake.advanceTime(FADE_OVER_MS);
    assert.deepEqual(shownIconNames(fake), [], "gone");
    fake.advanceTime(TOAST_ARRIVAL_MS);
    assert.deepEqual(toastCardsDrawn(fake), [WARNING_CARD]);
    assert.deepEqual(shownIconNames(fake), [], "and stays gone");
    assertNoErrorLogged(fake);
});
