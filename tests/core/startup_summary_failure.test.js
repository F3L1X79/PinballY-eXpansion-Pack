// ============================================================
// Startup summary that fails, through main.js on the fake PinballY globals:
// with no systemInfo.version, its failure and the PinballY Version Notice's are
// logged and the Add-ons still initialize.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";

test("a summary that cannot be gathered is logged and stops no Add-on", async () => {
    const fake = createFakePinballYHost({ pinballYVersion: null });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "clock";
    config.language = "en";

    await import("../../main.js");
    await settle();

    const errors = errorLines(fake);
    assert.equal(errors.length, 2);
    assert.match(errors[0], /^\[Startup\] ERROR writing the startup summary: /);
    assert.match(errors[1], /^\[Startup\] ERROR submitting the PinballY Version Notice: /);
    assert.ok(fake.logLines().some(line => line.startsWith(`[Startup] "clock" initialized`)));
});
