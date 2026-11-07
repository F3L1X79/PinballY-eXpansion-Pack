// ============================================================
// Profile Ratings, a later startup: the record names the active Profile, so
// PinballY's columns (rated in the last session) are read back into its file
// alone; no copy into the others, nothing written to PinballY.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// Rated 5 and made a favourite during Alice's last session; Attack from Mars un-favourited.
const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", rating: 5, isFavorite: true },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", rating: 3, isFavorite: false },
    { id: 3, configId: "Space Trip (VPX 2021)", title: "Space Trip", rating: -1, isFavorite: false },
];
// No longer in the game list: kept for when it comes back.
const GONE = "Gorgar (Williams 1979)";
const BOB_RATINGS = JSON.stringify({ version: 1, ratings: { "Space Trip (VPX 2021)": 1 }, favorites: ["Space Trip (VPX 2021)"] });

test("a later startup reads PinballY's columns back into the active Profile's file only", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, notified: [] }));
    fake.addFile(`${PROFILES}\\Alice\\ratings.json`, JSON.stringify({
        version: 1,
        ratings: { "Medieval Madness (Williams 1997)": 2, "Space Trip (VPX 2021)": 4, [GONE]: 3.5 },
        favorites: [GONE, "Attack from Mars (Bally 1995)"],
    }));
    fake.addFile(`${PROFILES}\\Bob\\ratings.json`, BOB_RATINGS);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings"].includes(key);
    config.language = "en";

    await import("../../main.js");
    await settle();

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\Alice\\ratings.json`)), {
        version: 1,
        ratings: { "Medieval Madness (Williams 1997)": 5, [GONE]: 3.5, "Attack from Mars (Bally 1995)": 3 },
        favorites: [GONE, "Medieval Madness (Williams 1997)"],
    });
    assert.ok(fake.readFile(`${PROFILES}\\Alice\\ratings.bak.json`), "written whole, with its backup");
    assert.equal(fake.readFile(`${PROFILES}\\Bob\\ratings.json`), BOB_RATINGS, "Bob keeps his own values");
    assert.equal(fake.readFile(`${PROFILES}\\guest\\ratings.json`), undefined, "no copy into Guest");
    assert.deepEqual(fake.gameUpdates().filter(({ changes }) => "rating" in changes || "isFavorite" in changes), []);
    assertNoErrorLogged(fake);
});
