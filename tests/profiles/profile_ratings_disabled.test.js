// ============================================================
// Profile Ratings turned off: no Ratings file, no cabinet record, nothing
// written to PinballY, even on what would be a first run.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", rating: 4, isFavorite: true },
];

test("the Add-on turned off writes and reads nothing", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, notified: [] }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "profilePicker";
    config.language = "en";

    await import("../../main.js");
    await settle();

    for (const path of [`${PROFILES}\\profile_ratings.json`, `${PROFILES}\\guest\\ratings.json`, `${PROFILES}\\Alice\\ratings.json`]) {
        assert.equal(fake.readFile(path), undefined, path);
    }
    assert.deepEqual(fake.gameUpdates().filter(({ changes }) => "rating" in changes || "isFavorite" in changes), []);
    assert.ok(fake.logLines().includes(`[Startup] "profileRatings" skipped (disabled in config).`));
    assertNoErrorLogged(fake);
});
