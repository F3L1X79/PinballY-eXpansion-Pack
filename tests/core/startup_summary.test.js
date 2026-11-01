// ============================================================
// Startup summary through main.js on the fake PinballY globals, on
// PinballY 1.1.0 Beta 10: one line with the Pack Version, PinballY version,
// language, Add-ons off, Profile count and visible table count, and no
// version warning.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { installVpxtool } from "../support/vpxtool.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", isHidden: false },
    { id: 3, configId: "Black Knight (Williams 1980)", title: "Black Knight", isHidden: true },
];

test("main.js writes one summary line at startup, and no warning on Beta 10", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFolder(`${PROFILES}\\Bob`);
    installVpxtool(fake);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = !["clock", "menuCleanup"].includes(key);
    config.language = "fr";

    await import("../../main.js");
    await settle();

    const packLines = fake.logLines().filter(line => line.startsWith("[ExpansionPack]"));
    assert.deepEqual(packLines, [
        `[ExpansionPack] Started: eXpansion Pack v${PACK_VERSION}, PinballY 1.1.0 (Beta 10), build 10086, language fr, `
            + "Add-ons off: clock, menuCleanup, 3 Profiles, 2 tables",
    ]);
    assertNoErrorLogged(fake);
});
