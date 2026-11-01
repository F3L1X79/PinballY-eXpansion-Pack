// ============================================================
// No "Update to vX.Y.Z" entry when the remembered release is the running
// Pack Version: nothing newer to install.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";
import { drawnMenuLines, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const fake = createFakePinballYHost({ now: new Date(2026, 9, 27, 20, 0, 0) });

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    fake.addFile(STATE_FILE, JSON.stringify({
        version: 1,
        latestRelease: { packVersion: PACK_VERSION, zipUrl: "https://example.invalid/ExpansionPack.zip", sha256: "c0".repeat(32) },
    }));
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("the running Pack Version remembered shows no Update entry", () => {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake).slice(-3), ["Offline Mode", "---", "Back"]);
    assertNoErrorLogged(fake);
});
