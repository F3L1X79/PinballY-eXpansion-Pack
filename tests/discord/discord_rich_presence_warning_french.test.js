// ============================================================
// Discord Rich Presence through main.js, without Discord, in French: the
// Warning Toast's header and sentence.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Warning Toast speaks French", async () => {
    // Read at i18n's first load, which the scenario's import brings.
    config.language = "fr";
    const { TOAST_ARRIVAL_MS, TRY_GAP_MS, startDiscordScenario, toastCardsDrawn } = await import("./discord_scenario.js");
    const { fake } = await startDiscordScenario({ discord: null });

    fake.advanceTime(2 * TRY_GAP_MS + TOAST_ARRIVAL_MS);

    assert.deepEqual(toastCardsDrawn(fake),
        ["AVERTISSEMENT | Discord Rich Presence | Discord introuvable : la table jouée n'apparaîtra pas sur Discord. Lancez Discord avant PinballY."]);
    assertNoErrorLogged(fake);
});
