// ============================================================
// Profile Ratings, a broken Ratings file: when the active Profile's values
// go onto PinballY's columns at startup, its broken ratings.json comes back
// from its backup, the recovery written to the Error Log.
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
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const MARS = "Attack from Mars (Bally 1995)";
// Bob's values on the columns.
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 1, isFavorite: false },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: -1, isFavorite: true },
];
const BACKUP = { version: 1, ratings: { [MEDIEVAL]: 4.5 }, favorites: [MEDIEVAL] };

test("a broken Ratings file comes back from its backup", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(`${ALICE}\\ratings.json`, "{ broken");
    fake.addFile(`${ALICE}\\ratings.bak.json`, JSON.stringify(BACKUP));
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
        [[4.5, true], [-1, false]], "Alice's values from her backup");
    assert.deepEqual(JSON.parse(fake.readFile(`${ALICE}\\ratings.json`)), BACKUP);
    assert.equal(fake.readFile(`${ALICE}\\ratings.broken-2026-11-07_21-00-00.json`), "{ broken", "the broken file kept aside");
    assert.match(fake.readFile(ERROR_LOG), /Alice\\ratings\.json is missing or unreadable; restored from its backup/);
    assertNoErrorLogged(fake);
});
