// ============================================================
// The Info Log's logInfo, through main.js: a cabinet check goes to info.log
// only, dated, never to logfile.log or the Error Log.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const NOW = new Date(2026, 10, 13, 21, 0, 0);
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const INFO_LOG = `${PACK}\\info.log`;
const ERROR_LOG = `${PACK}\\errors.log`;

test("logInfo writes to info.log only", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = false;
    config.language = "en";
    const { logInfo } = await import("../../common/core/info_log.js");
    await import("../../main.js");
    await settle();
    const logLinesBefore = fake.logLines().length;

    logInfo("WheelOrder", "copy restored at startup: yes");
    await settle();

    assert.equal(fake.logLines().length, logLinesBefore, "nothing more in logfile.log");
    assert.ok(fake.readFile(INFO_LOG).endsWith(`2026-11-13 21:00:00 v${PACK_VERSION} [WheelOrder] copy restored at startup: yes\r\n`));
    assert.equal(fake.readFile(ERROR_LOG), undefined);
    assertNoErrorLogged(fake);
});
