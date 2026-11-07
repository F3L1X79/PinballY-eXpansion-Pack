// ============================================================
// Profile Ratings and the Profile Reset: the Profile reset keeps its Ratings
// and Favorite Tables, on PinballY's columns and in its file, and gets them
// back on its next pick.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const MARS = "Attack from Mars (Bally 1995)";
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 4, isFavorite: true },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: 2.5, isFavorite: false },
];
const ALICE_RATINGS = { version: 1, ratings: { [MEDIEVAL]: 4, [MARS]: 2.5 }, favorites: [MEDIEVAL] };
const columns = fake => TABLES.map(({ configId }) => fake.getGameInfo(configId)).map(({ rating, isFavorite }) => [rating, isFavorite]);

test("a Profile Reset keeps the Profile's Ratings and Favorite Tables", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({
        version: 1, isAdmin: true, plays: { [MEDIEVAL]: { count: 3, seconds: 600, lastPlayed: "2026-11-01T20:00:00" } },
    }));
    fake.addFile(`${PROFILES}\\Alice\\ratings.json`, JSON.stringify(ALICE_RATINGS));
    fake.addFolder(`${PROFILES}\\Bob`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings"].includes(key);
    config.language = "en";

    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();

    const store = getProfileStore();
    store.resetProfile("Alice");
    await settle();
    assert.deepEqual(store.getPlaysOf("Alice"), {}, "Alice was reset");
    assert.deepEqual(columns(fake), [[4, true], [2.5, false]], "her values stay on the columns");

    store.switchTo("Bob");
    store.switchTo("Alice");
    await settle();
    assert.deepEqual(columns(fake), [[4, true], [2.5, false]], "and come back on her next pick");
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\Alice\\ratings.json`)), ALICE_RATINGS);
    assertNoErrorLogged(fake);
});
