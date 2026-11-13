// ============================================================
// An Info Log that cannot be written, through main.js: with info.log locked,
// the pack's lines still reach logfile.log, one more logfile.log line for the
// whole session says info.log could not be written and why (never sent to
// info.log in turn), and PinballY goes on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const NOW = new Date(2026, 10, 13, 21, 0, 0);
const INFO_LOG = "C:\\PinballY\\Scripts\\ExpansionPack\\logs\\info.log";

test("a locked info.log gives one logfile.log line and PinballY goes on", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    fake.addFile(INFO_LOG, "");
    fake.lockFile(INFO_LOG);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "clock" || key === "forceBackglass";
    config.language = "en";
    const { logInfo } = await import("../../common/core/info_log.js");
    await import("../../main.js");
    await settle();
    // A later tick's write fails again, without a second report.
    logInfo("WheelOrder", "a cabinet check");
    await settle();

    const failures = fake.logLines().filter(line => line.startsWith("[InfoLog]"));
    assert.deepEqual(failures, [`[InfoLog] info.log could not be written: Permission denied: ${INFO_LOG}`]);
    assert.equal(fake.readFile(INFO_LOG), "");
    assert.ok(fake.logLines().includes("[Startup] \"forceBackglass\" initialized in 0 ms."),
        "the pack's lines still reach logfile.log, and the scripts after the first one still start");
    assertNoErrorLogged(fake);
});
