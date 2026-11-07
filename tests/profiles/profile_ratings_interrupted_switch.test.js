// ============================================================
// Profile Ratings, a Profile change cut halfway: the record says a change
// from Alice to Bob was under way and the columns mix both, so at startup
// every table gets Bob's values, and Alice's file is left as it was.
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
// Medieval Madness already has Bob's values, the others still Alice's.
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 1, isFavorite: false },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: 5, isFavorite: true },
    { id: 3, configId: SPACE, title: "Space Trip", rating: -1, isFavorite: false },
];
const ALICE_RATINGS = JSON.stringify({ version: 1, ratings: { [MEDIEVAL]: 4, [MARS]: 5 }, favorites: [MEDIEVAL, MARS] });

test("a Profile change cut halfway is finished at startup with the active Profile's values", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\ratings.json`, ALICE_RATINGS);
    fake.addFile(`${PROFILES}\\Bob\\ratings.json`, JSON.stringify({ version: 1, ratings: { [MEDIEVAL]: 1, [SPACE]: 3 }, favorites: [SPACE] }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Bob" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({
        version: 1, columnsProfile: "Alice", change: { from: "Alice", to: "Bob" },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings"].includes(key);
    config.startupScreen = "wheel";
    config.language = "en";

    await import("../../main.js");
    await settle();

    assert.deepEqual(TABLES.map(({ configId }) => fake.getGameInfo(configId)).map(({ rating, isFavorite }) => [rating, isFavorite]),
        [[1, false], [-1, false], [3, true]], "every table holds Bob's values");
    assert.equal(fake.readFile(`${PROFILES}\\Alice\\ratings.json`), ALICE_RATINGS, "Alice's file is unchanged");
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\profile_ratings.json`)), { version: 1, columnsProfile: "Bob" });
    assertNoErrorLogged(fake);
});
