// ============================================================
// An Error Log that cannot be written, through main.js: with errors.log
// locked, each error still reaches logfile.log, one more logfile.log line
// for the whole session says errors.log could not be written and why, and
// PinballY goes on: the scripts after a failing one still start.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";

const NOW = new Date(2026, 9, 27, 20, 0, 0);
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const ERROR_LOG = `${PACK}\\logs\\errors.log`;
const ALICE_FILE = `${PACK}\\profiles\\Alice\\profile.json`;
const MARS = {
    id: 1, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", manufacturer: "Bally", year: 1995,
    categories: [], isConfigured: true, isHidden: false,
};

test("a locked errors.log gives one logfile.log line and PinballY goes on", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [MARS] });
    fake.addFile(ALICE_FILE, JSON.stringify({ version: 1 }));
    fake.addFile(ERROR_LOG, "");
    fake.lockFile(ERROR_LOG);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    // The Clock's init creates its layer first: that one call fails.
    const createDrawingLayer = mainWindow.createDrawingLayer;
    let failed = false;
    mainWindow.createDrawingLayer = (...args) => {
        if (failed) return createDrawingLayer(...args);
        failed = true;
        throw new Error("No layer today");
    };
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "clock" || key === "forceBackglass";
    config.language = "en";
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");

    // A second error of the session, after the first one failed to reach errors.log.
    fake.lockFile(ALICE_FILE);
    fake.gameStarted(MARS);
    fake.advanceTime(60 * 1000);
    fake.gameOver(MARS);
    await settle();

    assert.equal(errorLines(fake).length, 2, "both errors still in logfile.log");
    assert.equal(errorLines(fake)[0], "[Startup] ERROR initializing \"clock\": No layer today");
    assert.match(errorLines(fake)[1], /^\[ProfileStore\] ERROR in handler: /);
    const failures = fake.logLines().filter(line => line.startsWith("[ErrorLog]"));
    assert.deepEqual(failures, [`[ErrorLog] errors.log could not be written: Permission denied: ${ERROR_LOG}`]);
    assert.equal(fake.readFile(ERROR_LOG), "");
    assert.ok(fake.logLines().some(line => line === "[Startup] \"forceBackglass\" initialized in 0 ms."),
        "the scripts after the failing one still start");
});
