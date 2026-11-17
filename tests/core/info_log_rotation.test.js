// ============================================================
// The Info Log's rotation, through main.js: at each start, the last
// session's info.log becomes info.old.log before the start's first line,
// whatever its size, replacing an older info.old.log: info.log holds this
// session only, and the one before (a crashed one) stays readable.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const NOW = new Date(2026, 10, 13, 21, 0, 0);
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const INFO_LOG = `${PACK}\\logs\\info.log`;
const OLD_INFO_LOG = `${PACK}\\logs\\info.old.log`;
const LAST_SESSION = "2026-11-12 20:00:00 v0.1.0 [Startup] the last session's line\r\n";

test("the last session's info.log becomes info.old.log at startup, the older one replaced", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    fake.addFile(INFO_LOG, LAST_SESSION);
    fake.addFile(OLD_INFO_LOG, "an older info.old.log\r\n");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "clock";
    config.language = "en";
    await import("../../main.js");
    await settle();

    assert.equal(fake.readFile(OLD_INFO_LOG), LAST_SESSION, "the last session's info.log became info.old.log");
    const lines = fake.readFile(INFO_LOG).split("\r\n").filter(Boolean);
    assert.ok(lines[0].endsWith(fake.logLines()[0]), "the new info.log starts with this start's first line");
    assert.equal(lines.some(line => line.includes("the last session's line")), false, "and holds this session only");
    assertNoErrorLogged(fake);
});
