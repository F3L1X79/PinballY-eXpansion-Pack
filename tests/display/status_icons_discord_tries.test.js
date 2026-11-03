// ============================================================
// Status Icons, through main.js, with Discord not running: no icon during
// the three startup tries, nor after the Warning Toast.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { TOAST_ARRIVAL_MS, TRY_GAP_MS, WARNING_CARD, startDiscordScenario, toastCardsDrawn } from "../discord/discord_scenario.js";
import { shownIconNames } from "./status_icons_reader.js";

test("no Discord icon during the three tries, nor after the Warning Toast", async () => {
    const { fake } = await startDiscordScenario({ discord: null, addOns: ["discordRichPresence", "statusIcons"] });
    assert.deepEqual(shownIconNames(fake), [], "during the first try");
    fake.advanceTime(TRY_GAP_MS);
    assert.deepEqual(shownIconNames(fake), [], "after the second");
    fake.advanceTime(TRY_GAP_MS);
    fake.advanceTime(TOAST_ARRIVAL_MS);

    assert.deepEqual(toastCardsDrawn(fake), [WARNING_CARD]);
    assert.deepEqual(shownIconNames(fake), [], "after the Warning Toast");
    assertNoErrorLogged(fake);
});
