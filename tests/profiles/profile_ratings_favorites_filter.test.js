// ============================================================
// Profile Ratings and PinballY's Favorites filter: once a Profile is picked,
// "Favorite Tables" brings its own favourites to the wheel.
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
// Alice's favourites on the columns.
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: -1, isFavorite: true },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: -1, isFavorite: false },
    { id: 3, configId: SPACE, title: "Space Trip", rating: -1, isFavorite: true },
];

test("Favorite Tables brings the active Profile's favourites to the wheel", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\ratings.json`, JSON.stringify({ version: 1, ratings: {}, favorites: [MEDIEVAL, SPACE] }));
    fake.addFile(`${PROFILES}\\Bob\\ratings.json`, JSON.stringify({ version: 1, ratings: {}, favorites: [MARS] }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings"].includes(key);
    config.language = "en";

    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    const favoritesOnWheel = () => {
        fake.setCurrentFilter("Favorites");
        return fake.getWheelTables().map(game => game.title);
    };

    assert.deepEqual(favoritesOnWheel(), ["Medieval Madness", "Space Trip"]);
    getProfileStore().switchTo("Bob");
    await settle();
    assert.deepEqual(favoritesOnWheel(), ["Attack from Mars"]);
    assertNoErrorLogged(fake);
});
