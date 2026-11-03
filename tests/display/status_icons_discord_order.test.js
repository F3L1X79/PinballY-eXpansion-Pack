// ============================================================
// Status Icons, through main.js, all three at once: Discord first, in the
// slot, then the gold arrow and the crossed arrow, on one line, none over
// another.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { POLL_MS, startDiscordScenario } from "../discord/discord_scenario.js";
import { assertInSlot, shownIcons, shownIconNames, DISCORD, PACK_UPDATE_WAITING, UPDATE_CHECK_OFF } from "./status_icons_reader.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};

test("the Discord icon comes first in the row, before the update icons", async () => {
    const { fake } = await startDiscordScenario({
        addOns: ["discordRichPresence", "statusIcons"],
        settings: { updateCheck: false },
        seed: f => f.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE })),
    });
    fake.advanceTime(POLL_MS);

    assert.deepEqual(shownIconNames(fake), [DISCORD, PACK_UPDATE_WAITING, UPDATE_CHECK_OFF]);
    const { default: lang } = await import("../../common/core/i18n.js");
    assertInSlot(fake, lang, "Discord in the slot");
    const [symbol, arrow] = shownIcons(fake);
    assert.ok(arrow.left >= symbol.right, "the arrow right of the symbol");
    assert.ok(arrow.top >= symbol.top && arrow.bottom <= symbol.bottom, "on the symbol's line");
    assertNoErrorLogged(fake);
});
