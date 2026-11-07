// ============================================================
// Profile Ratings, the active Profile's folder renamed away while PinballY
// was closed: Guest becomes active with Guest's values, and none of the
// vanished Profile's values stay on the columns or reach Guest's file.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const MARS = "Attack from Mars (Bally 1995)";
// Alice's values on the columns.
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 4, isFavorite: true },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: 2, isFavorite: false },
];
const GUEST_RATINGS = JSON.stringify({ version: 1, ratings: { [MARS]: 3.5 }, favorites: [MARS] });

test("an active Profile renamed away leaves Guest with Guest's own values", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\guest\\ratings.json`, GUEST_RATINGS);
    // Alice's folder, set aside by its new name.
    fake.addFile(`${PROFILES}\\_Alice\\ratings.json`, JSON.stringify({ version: 1, ratings: { [MEDIEVAL]: 4, [MARS]: 2 }, favorites: [MEDIEVAL] }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings"].includes(key);
    config.language = "en";

    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();

    assert.equal(getProfileStore().getActiveProfile().isGuest, true);
    assert.deepEqual(TABLES.map(({ configId }) => fake.getGameInfo(configId)).map(({ rating, isFavorite }) => [rating, isFavorite]),
        [[-1, false], [3.5, true]], "Guest's values on the columns");
    assert.equal(fake.readFile(`${PROFILES}\\guest\\ratings.json`), GUEST_RATINGS, "Guest's file is unchanged");
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\profile_ratings.json`)), { version: 1, columnsProfile: "guest" });
    assertNoErrorLogged(fake);
});
