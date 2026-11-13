// ============================================================
// The Info Log's rotation, through main.js: an info.log over 1 MB at startup
// becomes info.old.log before the start's first line, replacing an older
// info.old.log, so two files at most are kept.
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
const FULL_LOG = "2026-10-01 20:00:00 v0.1.0 [Startup] an old start's line\r\n".repeat(20000);

test("an info.log over 1 MB becomes info.old.log, the older one replaced", async () => {
    assert.ok(Buffer.byteLength(FULL_LOG) > 1024 * 1024);
    const fake = createFakePinballYHost({ now: NOW });
    fake.addFile(INFO_LOG, FULL_LOG);
    fake.addFile(OLD_INFO_LOG, "an older info.old.log\r\n");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "clock";
    config.language = "en";
    await import("../../main.js");
    await settle();

    assert.ok(fake.readFile(OLD_INFO_LOG) === FULL_LOG, "the full info.log became info.old.log");
    assert.ok(fake.readFile(INFO_LOG).split("\r\n")[0].endsWith(fake.logLines()[0]), "the new info.log starts with this start's first line");
    assertNoErrorLogged(fake);
});
