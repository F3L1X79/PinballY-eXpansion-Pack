// ============================================================
// Pinning test for Profile Ratings: the file names and keys of each Profile's
// ratings.json and of the cabinet's profile_ratings.json, and the Ratings
// family's Achievement IDs.
// - These strings are players' saved Ratings and progress: this test must keep passing unchanged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createProfileRatings } from "../../common/profiles/profile_ratings.js";
import { buildRatingsAchievements } from "../../achievements/ratings.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", rating: 3.5, isFavorite: true },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", rating: -1, isFavorite: false },
];

test("the Ratings files keep their names and keys", () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFolder(`${PROFILES_FOLDER}\\Alice`);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    const profileStore = createProfileStore(fake);
    createProfileRatings(fake, { profileStore }).start();

    const ratings = JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\Alice\\ratings.json`));
    assert.deepEqual(Object.keys(ratings), ["version", "ratings", "favorites"]);
    assert.deepEqual(ratings, {
        version: 1,
        ratings: { "Medieval Madness (Williams 1997)": 3.5 },
        favorites: ["Medieval Madness (Williams 1997)"],
    });
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\profile_ratings.json`)), { version: 1, columnsProfile: "Alice" });
});

test("the Ratings Achievement IDs stay byte-identical", () => {
    assert.deepEqual(buildRatingsAchievements().map(achievement => achievement.id), [
        "ratings:1",
        "ratings:5",
        "ratings:10",
        "ratings:25",
    ]);
});
