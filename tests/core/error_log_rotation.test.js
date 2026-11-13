// ============================================================
// The Error Log's rotation, through main.js: an errors.log over 1 MB at
// startup becomes errors.old.log before the start's first error line,
// replacing an older errors.old.log, so two files at most are kept.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const NOW = new Date(2026, 9, 27, 8, 30, 0);
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const ERROR_LOG = `${PACK}\\logs\\errors.log`;
const OLD_ERROR_LOG = `${PACK}\\logs\\errors.old.log`;
const FULL_LOG = "2026-10-01 20:00:00 v0.1.0 [Clock] ERROR an old one\r\n".repeat(20000);

test("an errors.log over 1 MB becomes errors.old.log, the older one replaced", async () => {
    assert.ok(Buffer.byteLength(FULL_LOG) > 1024 * 1024);
    const fake = createFakePinballYHost({ now: NOW });
    fake.addFile(ERROR_LOG, FULL_LOG);
    fake.addFile(OLD_ERROR_LOG, "an older errors.old.log\r\n");
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

    assert.equal(errorLines(fake).length, 1);
    assert.equal(fake.readFile(OLD_ERROR_LOG), FULL_LOG);
    assert.equal(fake.readFile(ERROR_LOG).split("\r\n")[0], `2026-10-27 08:30:00 v${PACK_VERSION} [Startup] ERROR initializing "clock": No layer today`,
        "the new errors.log starts with this start's error");
});
