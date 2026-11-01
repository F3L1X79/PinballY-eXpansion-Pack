// ============================================================
// Status Icons, through main.js, with the Update Check turned off and a
// newer Pack Version remembered before it was: both update icons, the gold
// arrow first, then the crossed circular arrow, side by side.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { shownIcons, shownIconNames, PACK_UPDATE_WAITING, UPDATE_CHECK_OFF } from "./status_icons_reader.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};

test("the Update Check off shows the crossed arrow, after the gold arrow of a waiting Pack Update", async () => {
    const { fake, settle } = await startOnProfilePicker({
        addOns: ["clock", "statusIcons"],
        settings: { updateCheck: false },
        seed: f => f.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE })),
    });
    await settle();

    assert.deepEqual(shownIconNames(fake), [PACK_UPDATE_WAITING, UPDATE_CHECK_OFF]);
    const [arrow, crossed] = shownIcons(fake);
    assert.equal(crossed.top, arrow.top, "on the same line");
    assert.equal(crossed.alpha, 0xFF);
    assertNoErrorLogged(fake);
});
