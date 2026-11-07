// ============================================================
// Profile Ratings, a new Profile: created and picked, it starts with no
// Rating and no favourite, every value of the Profile left cleared from
// PinballY's columns and kept in its own file.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", rating: 4, isFavorite: true },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", rating: 0, isFavorite: false },
    { id: 3, configId: "Space Trip (VPX 2021)", title: "Space Trip", rating: -1, isFavorite: true },
];

test("a new Profile starts with no Rating and no favourite", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
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
    store.switchTo(store.createProfile("Max", "Guest"));
    await settle();

    assert.deepEqual(TABLES.map(({ configId }) => fake.getGameInfo(configId)).map(({ rating, isFavorite }) => [rating, isFavorite]),
        [[-1, false], [-1, false], [-1, false]], "no table rated or a favourite");
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\Alice\\ratings.json`)), {
        version: 1,
        ratings: { "Medieval Madness (Williams 1997)": 4, "Attack from Mars (Bally 1995)": 0 },
        favorites: ["Medieval Madness (Williams 1997)", "Space Trip (VPX 2021)"],
    }, "Alice keeps hers");
    assertNoErrorLogged(fake);
});
