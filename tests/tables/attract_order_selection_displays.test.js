// ============================================================
// The Attract Order In Order through main.js, with Profile Ratings and Table
// Mastery on: the pack's moves fire no "gameselect", yet after each of them
// the Rating Plate and the Mastery Bar show the table attract mode moved to.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { shownRating } from "../profiles/rating_plate_scenario.js";
import { shownMastery } from "../mastery/mastery_bar_scenario.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
const KEPT_SECONDS = 10;
const STEP_MS = KEPT_SECONDS * 1000;
// The startup over and every state drawn ahead.
const DRAWN_AHEAD_MS = 10000;
const HOUR = 3600;
const table = (id, title, rating) => ({
    id, configId: title, title, manufacturer: "", year: 0, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating, isFavorite: false, isHidden: false,
});
const TABLES = [table(1, "Attack from Mars", 4), table(2, "Black Knight", 2.5), table(3, "Cirqus Voltaire", -1)];
const played = seconds => ({ count: 1, seconds, lastPlayed: "2026-11-01T20:00:00" });

const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });

test("setup", async () => {
    fake.seedSettings({ [SWITCH_TIME_KEY]: 86400 });
    fake.addFile(`${PROFILES}\\guest\\profile.json`, JSON.stringify({
        version: 1, notified: [], plays: { "Black Knight": played(12 * HOUR) },
    }));
    fake.addFile(`${PROFILES}\\guest\\ratings.json`, JSON.stringify({
        version: 1, ratings: { "Attack from Mars": 4, "Black Knight": 2.5 }, favorites: [],
    }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "guest" }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "guest", attractOrderSwitchTime: KEPT_SECONDS }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["wheelOrder", "profileRatings", "tableMastery"].includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    config.attractOrder = "inOrder";
    await import("../../main.js");
    await settle();
    fake.advanceTime(DRAWN_AHEAD_MS);
});

test("the Rating Plate and the Mastery Bar follow each move of the Attract Order", async () => {
    assert.equal(shownRating(fake), 4, "the table on screen before attract mode");
    assert.equal(shownMastery(fake).head, "To discover");

    fake.enterAttractMode();
    await settle();
    fake.advanceTime(STEP_MS);
    assert.equal(fake.getCurrentTable().title, "Black Knight");
    assert.equal(shownRating(fake), 2.5);
    assert.deepEqual(shownMastery(fake), { head: "Pinball Wizard", number: "10", fill: 1 });

    fake.advanceTime(STEP_MS);
    assert.equal(fake.getCurrentTable().title, "Cirqus Voltaire");
    assert.equal(shownRating(fake), 0, "five empty stars on an unrated table");
    assert.equal(shownMastery(fake).head, "To discover");

    fake.advanceTime(STEP_MS);
    assert.equal(shownRating(fake), 4, "back on the first table");
    assertNoErrorLogged(fake);
});
