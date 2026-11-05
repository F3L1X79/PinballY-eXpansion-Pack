// ============================================================
// Startup summary through main.js on the fake PinballY globals, on
// PinballY 1.1.0 Beta 9: the WARNING line comes right after the summary.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { installVpxtool } from "../support/vpxtool.js";

const BETA_9_VERSION = {
    basic: "1.1.0", build: 9001, buildDate: new Date(Date.UTC(2023, 0, 1)),
    display: "1.1.0 (Beta 9)", semantic: "1.1.0-beta.9+9001.20230101T1200", status: "1.1.0",
};

test("main.js warns right after the summary when PinballY is older than Beta 10", async () => {
    const fake = createFakePinballYHost({ pinballYVersion: BETA_9_VERSION });
    installVpxtool(fake);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = true;
    config.language = "en";

    await import("../../main.js");
    await settle();

    const packLines = fake.logLines().filter(line => line.startsWith("[ExpansionPack]"));
    assert.deepEqual(packLines, [
        `[ExpansionPack] Started: eXpansion Pack v${PACK_VERSION}, PinballY 1.1.0 (Beta 9), build 9001, language en, `
            + "Add-ons off: none, 1 Profiles, 0 tables",
        "[ExpansionPack] WARNING: PinballY 1.1.0 (Beta 9) is older than 1.1.0 (Beta 10), the minimum this pack needs.",
    ]);
    assertNoErrorLogged(fake);
});
