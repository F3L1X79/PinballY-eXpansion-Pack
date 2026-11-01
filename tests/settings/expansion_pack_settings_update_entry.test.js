// ============================================================
// The "Update to vX.Y.Z" entry of the eXpansion Pack Settings, through
// main.js: shown while a newer Pack Version is remembered, it records the
// requested version, shows the Loader and starts the Pack Update with the
// remembered URL, digest and version; PinballY quits once the helper is ready.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, isDrawnMenuShown, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const PACK_UPDATE_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\pack_update.ps1";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};
const fake = createFakePinballYHost({ now: new Date(2026, 9, 27, 20, 0, 0) });

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    // Offered and answered "Later" at an earlier start.
    fake.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE, offeredVersion: "9.0.0" }));
    fake.addFile(PACK_UPDATE_HELPER, "helper");
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("the entry shows before Back while a newer Pack Version is remembered", () => {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake).slice(-5), ["Offline Mode", "---", "Update to v9.0.0", "---", "Back"]);
});

test("choosing it records the version, shows the Loader and starts the Pack Update", async () => {
    chooseEntry(fake, "Update to v9.0.0");
    await settle();

    assert.equal(isDrawnMenuShown(fake), false);
    assert.deepEqual(fake.packUpdatesAsked(), [RELEASE]);
    assert.equal(JSON.parse(fake.readFile(STATE_FILE)).requestedVersion, "9.0.0");
    assert.equal(readLoader(fake).shown, true);
    assert.equal(press(fake, "Select").defaultPrevented, true, "no button reaches the wheel meanwhile");

    fake.advanceTime(5000);
    assert.deepEqual(fake.executedCommands().filter(id => id === fake.getBuiltInCommand("Quit")), [fake.getBuiltInCommand("Quit")]);
    assertNoErrorLogged(fake);
});
