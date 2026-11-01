// ============================================================
// Status Icons, through main.js, in a pack installed with git: no update
// icon at all, even with a newer Pack Version remembered and the Update
// Check off, since git pull updates the pack.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { shownIconNames } from "./status_icons_reader.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};

test("a git checkout shows no update icon", async () => {
    const { fake, settle } = await startOnProfilePicker({
        addOns: ["clock", "statusIcons"],
        settings: { updateCheck: false },
        seed: f => {
            f.addFolder("C:\\PinballY\\Scripts\\ExpansionPack\\.git");
            f.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE }));
        },
    });
    await settle();

    assert.deepEqual(shownIconNames(fake), []);
    assertNoErrorLogged(fake);
});
