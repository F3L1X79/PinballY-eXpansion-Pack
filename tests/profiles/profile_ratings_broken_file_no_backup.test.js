// ============================================================
// Profile Ratings, a broken Ratings file with no readable backup: both are
// set aside and logged, the Profile is read as having no Rating and no
// favourite, and startup goes on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const NOW = new Date(2026, 10, 7, 21, 0, 0);
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const ERROR_LOG = `${PACK}\\errors.log`;
const PROFILES = `${PACK}\\profiles`;
const ALICE = `${PROFILES}\\Alice`;
// Bob's values on the columns.
const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", rating: 1, isFavorite: true },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", rating: 3, isFavorite: false },
];

test("a broken Ratings file with no readable backup is set aside and read as empty", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(`${ALICE}\\ratings.json`, "{ broken");
    fake.addFile(`${ALICE}\\ratings.bak.json`, "[]");
    fake.addFolder(`${PROFILES}\\Bob`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "Bob" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings"].includes(key);
    config.language = "en";

    await import("../../main.js");
    await settle();

    assert.deepEqual(TABLES.map(({ configId }) => fake.getGameInfo(configId)).map(({ rating, isFavorite }) => [rating, isFavorite]),
        [[-1, false], [-1, false]], "Alice has no Rating and no favourite");
    assert.equal(fake.readFile(`${ALICE}\\ratings.broken-2026-11-07_21-00-00.json`), "{ broken");
    assert.equal(fake.readFile(`${ALICE}\\ratings.bak.broken-2026-11-07_21-00-00.json`), "[]");
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\profile_ratings.json`)), { version: 1, columnsProfile: "Alice" },
        "startup went on");
    assert.match(fake.readFile(ERROR_LOG), /Alice\\ratings\.json and its backup are unreadable; kept aside/);
    assertNoErrorLogged(fake);
});
