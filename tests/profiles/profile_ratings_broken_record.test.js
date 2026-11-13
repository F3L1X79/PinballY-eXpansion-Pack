// ============================================================
// Profile Ratings, a broken cabinet record with no readable backup: set
// aside and logged, then read as naming the active Profile with no change
// under way; never a first run, so no Profile's file gets the copy.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const NOW = new Date(2026, 10, 7, 21, 0, 0);
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const ERROR_LOG = `${PACK}\\logs\\errors.log`;
const PROFILES = `${PACK}\\profiles`;
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const MARS = "Attack from Mars (Bally 1995)";
// Rated during Alice's last session.
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 5, isFavorite: true },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: -1, isFavorite: false },
];
const BOB_RATINGS = JSON.stringify({ version: 1, ratings: { [MARS]: 2 }, favorites: [MARS] });

test("a broken cabinet record is set aside, logged, and never triggers the first-run copy", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\ratings.json`, JSON.stringify({ version: 1, ratings: { [MARS]: 4 }, favorites: [MARS] }));
    fake.addFile(`${PROFILES}\\Bob\\ratings.json`, BOB_RATINGS);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, "{ broken");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings"].includes(key);
    config.language = "en";

    await import("../../main.js");
    await settle();

    assert.equal(fake.readFile(`${PROFILES}\\Bob\\ratings.json`), BOB_RATINGS, "Bob's file gets no copy");
    assert.equal(fake.readFile(`${PROFILES}\\guest\\ratings.json`), undefined, "nor does Guest");
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\Alice\\ratings.json`)), {
        version: 1, ratings: { [MEDIEVAL]: 5 }, favorites: [MEDIEVAL],
    }, "the columns are read back into Alice");
    assert.deepEqual(fake.gameUpdates().filter(({ changes }) => "rating" in changes || "isFavorite" in changes), []);
    assert.equal(fake.readFile(`${PROFILES}\\profile_ratings.broken-2026-11-07_21-00-00.json`), "{ broken");
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\profile_ratings.json`)), { version: 1, columnsProfile: "Alice" });
    assert.match(fake.readFile(ERROR_LOG), /profile_ratings\.json and its backup are unreadable; kept aside/);
    assertNoErrorLogged(fake);
});
