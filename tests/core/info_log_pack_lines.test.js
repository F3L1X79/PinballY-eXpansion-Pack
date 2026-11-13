// ============================================================
// The Info Log, through main.js: every line the pack writes to logfile.log,
// through a host or a former direct caller, also lands in info.log in the
// pack folder, dated with the Pack Version, its text unchanged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const NOW = new Date(2026, 10, 13, 21, 0, 0);
const INFO_LOG = "C:\\PinballY\\Scripts\\ExpansionPack\\info.log";

test("every pack line of logfile.log is also in info.log, dated", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "clock";
    config.language = "en";
    await import("../../main.js");
    await settle();
    // The window layout's line, logged during settle(), reaches info.log on the next tick.
    await settle();

    assert.ok(fake.logLines().includes("[Startup] \"clock\" initialized in 0 ms."), "a former direct caller's line");
    assert.ok(fake.logLines().some(line => line.startsWith("[ExpansionPack] Started: ")), "a host's line");
    const dated = fake.logLines().map(line => `2026-11-13 21:00:00 v${PACK_VERSION} ${line}`);
    assert.deepEqual(fake.readFile(INFO_LOG).split("\r\n").filter(line => line.length > 0), dated);
    assertNoErrorLogged(fake);
});
