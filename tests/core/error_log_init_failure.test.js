// ============================================================
// The Error Log, through main.js: a script whose init() throws is logged
// and skipped as before, and its error lands in errors.log too, its stack on
// indented lines there only, so a script that failed to start leaves a trace
// after PinballY restarted.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const NOW = new Date(2026, 9, 27, 8, 30, 0);
const ERROR_LOG = "C:\\PinballY\\Scripts\\ExpansionPack\\logs\\errors.log";
const fake = createFakePinballYHost({ now: NOW });

test("a script whose init throws lands in errors.log", async () => {
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

    assert.deepEqual(errorLines(fake), ["[Startup] ERROR initializing \"clock\": No layer today"],
        "the logfile.log line holds no stack");
    const lines = fake.readFile(ERROR_LOG).split("\r\n");
    assert.equal(lines[0], `2026-10-27 08:30:00 v${PACK_VERSION} [Startup] ERROR initializing "clock": No layer today`);
    assert.equal(lines.at(-1), "", "each line ends with CRLF");
    const stack = lines.slice(1, -1);
    assert.ok(stack.length > 0, "the stack follows");
    for (const line of stack) assert.match(line, /^ {4}at \S/, "each stack line indented by four spaces, its header not repeated");
});

// Runs after the test above, on the globals it installed.
test("an error without a stack writes the entry line alone", async () => {
    const { logError } = await import("../../common/core/error_log.js");
    const before = fake.readFile(ERROR_LOG);
    const error = new Error("No stack today");
    error.stack = undefined;

    logError("Startup", "ERROR somewhere: No stack today", null, error);

    assert.equal(fake.readFile(ERROR_LOG).slice(before.length), `2026-10-27 08:30:00 v${PACK_VERSION} [Startup] ERROR somewhere: No stack today\r\n`);
});
