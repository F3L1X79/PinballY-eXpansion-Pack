// ============================================================
// Profile Ratings, first run: with no cabinet record yet, the cabinet's
// current Ratings and Favorite Tables are copied into every Profile, Guest
// included, and nothing is written to PinballY.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const ALICE_PROFILE = JSON.stringify({ version: 1, notified: [] });
const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", rating: 4.5, isFavorite: true },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", rating: -1, isFavorite: true },
    { id: 3, configId: "Space Trip (VPX 2021)", title: "Space Trip", rating: 0, isFavorite: false },
    { id: 4, configId: "Homebrew Table", title: "Homebrew Table", rating: -1, isFavorite: false, isHidden: true },
    { id: 5, configId: "Gorgar (Williams 1979)", title: "Gorgar", rating: 2, isFavorite: true, isHidden: true },
];

test("the first run gives the cabinet's Ratings and Favorite Tables to every Profile, Guest included", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, ALICE_PROFILE);
    fake.addFolder(`${PROFILES}\\Bob`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings"].includes(key);
    config.language = "en";

    await import("../../main.js");
    await settle();

    const expected = {
        version: 1,
        ratings: { "Medieval Madness (Williams 1997)": 4.5, "Space Trip (VPX 2021)": 0, "Gorgar (Williams 1979)": 2 },
        favorites: ["Medieval Madness (Williams 1997)", "Attack from Mars (Bally 1995)", "Gorgar (Williams 1979)"],
    };
    for (const folder of ["guest", "Alice", "Bob"]) {
        assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\${folder}\\ratings.json`)), expected, folder);
        assert.equal(fake.readFile(`${PROFILES}\\${folder}\\ratings.tmp.json`), undefined, `${folder}: no tmp file left`);
    }
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\profile_ratings.json`)), { version: 1, columnsProfile: "Alice" });
    assert.equal(fake.readFile(`${PROFILES}\\Alice\\profile.json`), ALICE_PROFILE, "profile.json left alone");
    assert.deepEqual(fake.gameUpdates().filter(({ changes }) => "rating" in changes || "isFavorite" in changes), []);
    assert.deepEqual(TABLES.map(({ configId }) => fake.getGameInfo(configId)).map(({ rating, isFavorite }) => [rating, isFavorite]),
        TABLES.map(({ rating, isFavorite }) => [rating, isFavorite]), "PinballY's columns untouched");
    assertNoErrorLogged(fake);
});
