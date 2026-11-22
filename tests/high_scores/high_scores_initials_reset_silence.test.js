// ============================================================
// After a Profile Reset, the High Scores Achievements reached by the places
// a Profile's Initials took are unlocked again without a toast, through
// main.js on the fake globals with the High Scores and the Achievements on:
// for the active Profile at once, for another one when it is picked.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const table = (id, title, manufacturer, year) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false,
});
const MM = table(1, "Medieval Madness", "Williams", 1997);
const AFM = table(2, "Attack from Mars", "Bally", 1995);
const place = (rank, initials, score, owner) => ({ rank, initials, score, owner });
// Alice's Default Scores (ALI) on both tables, one a Table Record, and Bob's (BOB) on one.
const BOARDS = {
    [MM.configId]: { board: [place(1, "ALI", 9000, null), place(2, "BOB", 8000, null)] },
    [AFM.configId]: { board: [place(1, "SLL", 6000, null), place(2, "ALI", 5000, null)] },
};
// Every toast submitted so far has had its time on screen.
const ALL_TOASTS_MS = 18000;

const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0), tables: [MM, AFM] });
let store;
let highScores;

async function waitForToasts() {
    await settle();
    fake.advanceTime(ALL_TOASTS_MS);
    await settle();
}

const allToasts = () => toastDrawings(fake).map(drawing => drawing.texts.join(" | "));

// The Profile's Initials take their places, unannounced, before the test.
async function claim(name, initials) {
    store.setInitials(name, initials);
    highScores.claimInitialsPlaces(name);
    await waitForToasts();
}

test("setup", async () => {
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    for (const name of ["Alice", "Bob"]) fake.addFile(profileFile(name), JSON.stringify({ version: 1 }));
    fake.addFile(`${PROFILES}\\high_scores.json`, JSON.stringify({ version: 1, tables: BOARDS, highScores: [] }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["highScores", "achievements"].includes(key);
    config.language = "en";
    await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const { getHighScoreStore } = await import("../../common/high_scores/high_score_store.js");
    await import("../../main.js");
    await settle();
    store = getProfileStore();
    highScores = getHighScoreStore();
    store.switchTo("Alice");
    await waitForToasts();
    await claim("Alice", "ALI");
    await claim("Bob", "BOB");
    assert.deepEqual(allToasts(), [], "the claims announce nothing");
    assert.ok(store.getNotifiedOf("Alice").includes("tableRecordTables:1"));
});

test("the active Profile's reset unlocks again, without a toast, what its Initials' places reach", async () => {
    store.resetProfile("Alice");
    await waitForToasts();

    assert.deepEqual(allToasts(), []);
    assert.ok(store.getNotifiedOf("Alice").includes("highScoreTables:1"), "unlocked again, Notified");
    assert.ok(store.getNotifiedOf("Alice").includes("tableRecordTables:1"));
    assert.equal(store.isUnannouncedCheckDue("Alice"), false);
});

test("another Profile's reset unlocks them again without a toast when it is picked", async () => {
    store.resetProfile("Bob");
    store.switchTo("Bob");
    await waitForToasts();

    assert.deepEqual(allToasts(), []);
    assert.ok(store.getNotifiedOf("Bob").includes("highScoreTables:1"));
    assert.equal(store.isUnannouncedCheckDue("Bob"), false);
    assertNoErrorLogged(fake);
});
