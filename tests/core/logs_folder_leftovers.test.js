// ============================================================
// The logs folder, through main.js: an errors.log and errors.old.log that
// an older version left in the pack folder move into logs at the session's
// first error, before its line is added; a file already in logs is kept.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";

const NOW = new Date(2026, 10, 13, 21, 0, 0);
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const OLD_LINE = "2026-10-01 20:00:00 v1.5.1 [Clock] ERROR an old one\r\n";

test("an older version's errors.log moves into the logs folder", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    fake.addFile(`${PACK}\\errors.log`, OLD_LINE);
    fake.addFile(`${PACK}\\errors.old.log`, "an older errors.old.log\r\n");
    fake.addFile(`${PACK}\\info.log`, "a leftover info.log\r\n");
    fake.addFile(`${PACK}\\logs\\info.log`, "the logs folder's info.log\r\n");
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
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "clock";
    config.language = "en";
    await import("../../main.js");
    await settle();
    await settle();

    assert.equal(errorLines(fake).length, 1);
    assert.equal(fake.readFile(`${PACK}\\errors.log`), undefined);
    assert.equal(fake.readFile(`${PACK}\\errors.old.log`), undefined);
    assert.equal(fake.readFile(`${PACK}\\logs\\errors.old.log`), "an older errors.old.log\r\n");
    const errorLog = fake.readFile(`${PACK}\\logs\\errors.log`);
    assert.ok(errorLog.startsWith(OLD_LINE), "the old lines first");
    assert.match(errorLog, /\[Startup\] ERROR initializing "clock": No layer today/);
    assert.equal(fake.readFile(`${PACK}\\info.log`), "a leftover info.log\r\n", "never over a file already in logs");
    assert.ok(fake.readFile(`${PACK}\\logs\\info.log`).startsWith("the logs folder's info.log\r\n"));
});
