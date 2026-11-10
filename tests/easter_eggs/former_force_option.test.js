// ============================================================
// An .env.local written while the Easter Eggs were checked on the cabinet
// still carries FORCE_EASTER_EGG: the line is ignored and logged, the other
// lines apply, and the Easter Egg stays left to its chance.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";

test("a FORCE_EASTER_EGG line left in .env.local is ignored, and the Crow is not won", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 10, 20, 0, 0) });
    fake.addFile(`${PACK}\\.env.local`, "LANGUAGE=fr\r\nFORCE_EASTER_EGG=crow\r\n");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();

    // Imported after the globals, so the configuration reads .env.local.
    const { default: config } = await import("../../common/core/config.js");
    const { getEasterEggRules, EASTER_EGG } = await import("../../common/easter_eggs/easter_egg_rules.js");

    assert.equal(config.language, "fr", "the other lines still apply");
    assert.equal("forceEasterEgg" in config, false);
    assert.ok(fake.logLines().some(line => line.includes("unknown key \"FORCE_EASTER_EGG\"")), "logged as ignored");
    assert.equal(getEasterEggRules().tryWin(EASTER_EGG.CROW), false, "left to its chance, which the fake host never wins");
    assertNoErrorLogged(fake);
});
