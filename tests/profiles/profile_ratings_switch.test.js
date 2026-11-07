// ============================================================
// Profile Ratings, Change Player: PinballY's columns take the next Profile's
// Ratings and Favorite Tables, keeping in the one left what it changed; only
// the tables that differ get an update(), carrying rating / isFavorite alone.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const MARS = "Attack from Mars (Bally 1995)";
const SPACE = "Space Trip (VPX 2021)";
const GORGAR = "Gorgar (Williams 1979)";
// Alice's values on the columns; Gorgar, hidden, the same for both.
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 5, isFavorite: true, playCount: 4 },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: 3, isFavorite: false, playCount: 2 },
    { id: 3, configId: SPACE, title: "Space Trip", rating: -1, isFavorite: false, playCount: 0 },
    { id: 4, configId: GORGAR, title: "Gorgar", rating: 2, isFavorite: true, isHidden: true, playCount: 1 },
];
const columns = fake => TABLES.map(({ configId }) => fake.getGameInfo(configId))
    .map(({ configId, rating, isFavorite }) => [configId, rating, isFavorite]);
const ratingsOf = (fake, name) => JSON.parse(fake.readFile(`${PROFILES}\\${name}\\ratings.json`));

test("Change Player gives PinballY's columns the next Profile's values, and back", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\ratings.json`, JSON.stringify({
        version: 1, ratings: { [MEDIEVAL]: 5, [MARS]: 3, [GORGAR]: 2 }, favorites: [MEDIEVAL, GORGAR],
    }));
    fake.addFile(`${PROFILES}\\Bob\\ratings.json`, JSON.stringify({
        version: 1, ratings: { [MEDIEVAL]: 1.5, [SPACE]: 4, [GORGAR]: 2 }, favorites: [SPACE, GORGAR],
    }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings"].includes(key);
    config.language = "en";

    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();

    // Alice rates Attack from Mars again and makes it a favourite before leaving.
    fake.getGameInfo(MARS).update({ rating: 4.5, isFavorite: true });
    const updatesBefore = fake.gameUpdates().length;
    getProfileStore().switchTo("Bob");
    await settle();

    assert.deepEqual(columns(fake), [[MEDIEVAL, 1.5, false], [MARS, -1, false], [SPACE, 4, true], [GORGAR, 2, true]]);
    assert.deepEqual(fake.gameUpdates().slice(updatesBefore), [
        { configId: MEDIEVAL, changes: { rating: 1.5, isFavorite: false } },
        { configId: MARS, changes: { rating: -1, isFavorite: false } },
        { configId: SPACE, changes: { rating: 4, isFavorite: true } },
    ], "the differing tables alone, with rating / isFavorite alone");
    assert.deepEqual(ratingsOf(fake, "Alice"), {
        version: 1, ratings: { [MEDIEVAL]: 5, [MARS]: 4.5, [GORGAR]: 2 }, favorites: [MEDIEVAL, GORGAR, MARS],
    }, "Alice keeps what she changed");
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\profile_ratings.json`)), { version: 1, columnsProfile: "Bob" });

    // Bob takes Space Trip out of his favourites.
    fake.getGameInfo(SPACE).update({ isFavorite: false });
    getProfileStore().switchTo("Alice");
    await settle();

    assert.deepEqual(columns(fake), [[MEDIEVAL, 5, true], [MARS, 4.5, true], [SPACE, -1, false], [GORGAR, 2, true]]);
    assert.deepEqual(ratingsOf(fake, "Bob").favorites, [GORGAR], "Bob keeps what he changed");
    assert.deepEqual(fake.gameUpdates().slice(updatesBefore)
        .filter(({ changes }) => Object.keys(changes).some(field => !["rating", "isFavorite"].includes(field))), [],
    "no other field is written");
    assert.deepEqual(TABLES.map(({ configId }) => fake.getGameInfo(configId)).map(({ isHidden, playCount }) => [isHidden, playCount]),
        TABLES.map(({ isHidden, playCount }) => [isHidden, playCount]), "the Hidden flag and play stats untouched");
    assertNoErrorLogged(fake);
});
