// ============================================================
// No "Update to vX.Y.Z" entry in a pack installed with git, even with a
// newer Pack Version remembered: git pull updates the pack.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROJECT = "C:\\PinballY\\Scripts\\ExpansionPack";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};
const fake = createFakePinballYHost({ now: new Date(2026, 9, 27, 20, 0, 0) });

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    fake.addFile(`${PROJECT}\\pack_update.json`, JSON.stringify({ version: 1, latestRelease: RELEASE }));
    fake.addFolder(`${PROJECT}\\.git`);
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("a git checkout shows no Update entry", () => {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake).slice(-3), ["Offline Mode", "---", "Back"]);
    assertNoErrorLogged(fake);
});
