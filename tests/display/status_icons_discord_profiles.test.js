// ============================================================
// Status Icons, through main.js, whoever the active Profile is: the Discord
// icon is shown to Guest and to a Child Profile, who still sees no update icon.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { POLL_MS, startDiscordScenario } from "../discord/discord_scenario.js";
import { shownIconNames, DISCORD, UPDATE_CHECK_OFF } from "./status_icons_reader.js";

const FADE_OVER_MS = 300;

test("the Discord icon is shown to Guest and to a Child Profile", async () => {
    const { fake, profileStore } = await startDiscordScenario({
        addOns: ["discordRichPresence", "statusIcons"],
        profiles: { Boss: { isAdmin: true }, Kid: { isChild: true } },
        settings: { updateCheck: false },
    });
    fake.advanceTime(POLL_MS);
    assert.deepEqual(shownIconNames(fake), [DISCORD], "Guest, without the update icons");

    profileStore.switchTo("Kid");
    fake.advanceTime(FADE_OVER_MS);
    assert.deepEqual(shownIconNames(fake), [DISCORD], "a Child Profile, without the update icons");

    profileStore.switchTo("Boss");
    fake.advanceTime(FADE_OVER_MS);
    assert.deepEqual(shownIconNames(fake), [DISCORD, UPDATE_CHECK_OFF], "the Admin Profile, with them");
    assertNoErrorLogged(fake);
});
