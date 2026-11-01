// ============================================================
// The "Update to vX.Y.Z" entry whose helper never gets ready, through
// main.js: "Update not possible" shows at once with OK, PinballY stays, and
// the entry is still in the eXpansion Pack Settings to try again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { errorLines } from "../support/error_log.js";

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
    fake.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE, offeredVersion: "9.0.0" }));
    fake.addFile(PACK_UPDATE_HELPER, "helper");
    fake.failNextPackUpdate();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("a Pack Update that never gets ready says so at once, and PinballY stays", async () => {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Update to v9.0.0");
    fake.advanceTime(1000);
    assert.equal(press(fake, "Next").defaultPrevented, true, "no button reaches the wheel while the helper gets ready");
    fake.advanceTime(119000);
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual([readDrawnMenu(fake).title, readDrawnMenu(fake).message], ["Update not possible", "The eXpansion Pack stays as it is."]);
    assert.deepEqual(drawnMenuLines(fake), ["OK"]);
    assert.equal(readLoader(fake).shown, false);
    assert.ok(!fake.executedCommands().includes(fake.getBuiltInCommand("Quit")));
    assert.equal(JSON.parse(fake.readFile(STATE_FILE)).requestedVersion, undefined, "no update in progress");
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /^\[PackUpdate\] ERROR Pack Update not possible: /);
});

test("after OK, the buttons work again and the entry is still in the eXpansion Pack Settings", () => {
    chooseEntry(fake, "OK");
    fake.advanceTime(OPEN_OVER_MS);
    assert.notEqual(press(fake, "Next").defaultPrevented, true, "the wheel moves again");
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);

    assert.ok(drawnMenuLines(fake).includes("Update to v9.0.0"));
    assert.equal(errorLines(fake).length, 1, "no other error");
});
