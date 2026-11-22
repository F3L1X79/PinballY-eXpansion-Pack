// ============================================================
// The High Score store's claim by a Profile's Initials (ADR 0026), on the
// fake PinballY host with a real Profile store and a seeded high_scores.json:
// every known place that never had an owner and bears the Initials (trimmed,
// any case) becomes the Profile's High Score, silently; the preview counts
// the same without writing.
// - A Play's, another Profile's or a removed Profile's place is never taken.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createHighScoreStore } from "../../common/high_scores/high_score_store.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const HIGH_SCORES_FILE = `${PROFILES}\\high_scores.json`;
const MM = "Medieval Madness (Williams 1997)";
const AFM = "Attack from Mars (Bally 1995)";
const TZ = "Twilight Zone (Bally 1993)";

const place = (rank, initials, score, owner) => ({ rank, initials, score, owner });

// The boards of three tables: Default Scores bearing FEL (padded, lower
// case), a Play's place bearing FEL, Bob's, and a removed Profile's (Carol).
const BOARDS = {
    [MM]: [place(1, " fel", 9000, null), place(2, "SLL", 8000, null), place(3, "FEL", 7000, "Bob")],
    [AFM]: [place(1, "BOB", 6000, "Bob"), place(2, "FEL ", 5000, null), place(3, "FEL", 4000, null)],
    [TZ]: [place(1, "FEL", 3000, "Carol"), place(2, "LED", 2000, null)],
};

function setUp({ boards = BOARDS, highScores = [] } = {}) {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0), tables: [] });
    fake.installGlobals();
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, plays: {} }));
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, plays: {} }));
    const tables = Object.fromEntries(Object.entries(boards).map(([configId, board]) => [configId, { board }]));
    fake.addFile(HIGH_SCORES_FILE, JSON.stringify({ version: 1, tables, highScores }));
    const profileStore = createProfileStore(fake);
    const store = createHighScoreStore(fake, profileStore);
    return { fake, profileStore, store };
}

// The places of a board as (rank, owner's name or null).
const ownersOn = (store, configId) => store.boardOf(configId).map(({ rank, owner }) => [rank, owner ? owner.name : null]);

test("the preview counts the places and tables the Initials would take, writing nothing", () => {
    const { fake, store } = setUp();
    const before = fake.readFile(HIGH_SCORES_FILE);

    assert.deepEqual(store.previewInitialsClaim("FEL"), { places: 3, tables: 2 });
    assert.deepEqual(store.previewInitialsClaim("fel"), { places: 3, tables: 2 }, "any case");
    assert.deepEqual(store.previewInitialsClaim("XYZ"), { places: 0, tables: 0 });
    assert.equal(fake.readFile(HIGH_SCORES_FILE), before);
});

test("claiming takes every place without an owner bearing the Initials, and only those", () => {
    const { profileStore, store } = setUp();
    profileStore.setInitials("Alice", "FEL");

    assert.deepEqual(store.claimInitialsPlaces("Alice"), { places: 3, tables: 2, givenBack: 0 }, "the preview's figures");
    assert.deepEqual(ownersOn(store, MM), [[1, "Alice"], [2, null], [3, "Bob"]], "a Play's place bearing FEL stays Bob's");
    assert.deepEqual(ownersOn(store, AFM), [[1, "Bob"], [2, "Alice"], [3, "Alice"]]);
    assert.deepEqual(ownersOn(store, TZ), [[1, null], [2, null]], "a removed Profile's place is never taken");
    assert.deepEqual(store.previewInitialsClaim("FEL"), { places: 0, tables: 0 }, "nothing left to take");
});

test("a claimed place counts everywhere a High Score does, marked as taken by Initials and dated at the claim", () => {
    const { fake, profileStore, store } = setUp();
    profileStore.setInitials("Alice", "FEL");
    store.claimInitialsPlaces("Alice");

    assert.deepEqual(store.placesHeldBy("Alice"), [{ configId: MM, bestPlace: 1 }, { configId: AFM, bestPlace: 2 }], "My High Scores");
    assert.deepEqual(store.householdBoardOf(MM).map(({ score, owner }) => [score, owner.name]), [[9000, "Alice"]]);
    assert.deepEqual(store.personalBoardOf(AFM, "Alice").map(({ rank, score }) => [rank, score]), [[1, 5000], [2, 4000]]);
    assert.deepEqual(store.achievementCountsOf("Alice"), {
        highScoreTables: 2, tableRecordTables: 1, tookTableRecord: false, tookGrownUpTableRecord: false,
    });
    const saved = JSON.parse(fake.readFile(HIGH_SCORES_FILE)).highScores;
    assert.deepEqual(saved[0], {
        profile: "Alice", configId: MM, score: 9000, initials: " fel", place: 1, date: "2026-11-22T20:00:00",
        tableRecord: true, takenFrom: null, takenByInitials: true,
    });
    assert.ok(fake.logLines().some(line => line.includes(`"${MM}": place 1, 9000 ( fel) taken by the Initials FEL for Alice.`)), "each claim logged");
});

test("a claim announces nothing and leaves an unannounced Achievements check due", () => {
    const { profileStore, store } = setUp();
    const credited = [];
    store.onCredited(name => credited.push(name));
    profileStore.setInitials("Bob", "FEL");

    store.claimInitialsPlaces("Bob");

    assert.deepEqual(credited, [], "no High Score Toast nor Achievements check of a Play");
    assert.equal(profileStore.isUnannouncedCheckDue("Bob"), true);
    assert.equal(profileStore.isUnannouncedCheckDue("Alice"), false);
});

test("Initials taking nothing write nothing and leave no check due", () => {
    const { fake, profileStore, store } = setUp();
    profileStore.setInitials("Alice", "XYZ");
    const before = fake.readFile(HIGH_SCORES_FILE);

    assert.deepEqual(store.claimInitialsPlaces("Alice"), { places: 0, tables: 0, givenBack: 0 });
    assert.equal(fake.readFile(HIGH_SCORES_FILE), before);
    assert.equal(profileStore.isUnannouncedCheckDue("Alice"), false);
});

test("a claimed Table Record beaten in a Play by another Profile is a Lost Record", () => {
    const { profileStore, store } = setUp();
    profileStore.setInitials("Alice", "FEL");
    store.markLostRecordsSeen("Alice");
    store.claimInitialsPlaces("Alice");

    store.settlePlay(MM, [place(1, "BOB", 9500), place(2, " fel", 9000), place(3, "SLL", 8000)], { profileName: "Bob", start: new Date(2026, 10, 22, 21, 0, 0) });

    assert.deepEqual(store.lostRecordsOf("Alice", [MM]).map(({ configId, taker }) => [configId, taker.name]), [[MM, "Bob"]]);
});

test("a claim whose save fails throws and changes nothing", () => {
    const { fake, profileStore, store } = setUp();
    profileStore.setInitials("Alice", "FEL");
    const before = fake.readFile(HIGH_SCORES_FILE);
    fake.lockFile(HIGH_SCORES_FILE);

    assert.throws(() => store.claimInitialsPlaces("Alice"), /Permission denied/);

    assert.deepEqual(ownersOn(store, MM), [[1, null], [2, null], [3, "Bob"]]);
    assert.deepEqual(store.placesHeldBy("Alice"), []);
    assert.equal(profileStore.isUnannouncedCheckDue("Alice"), false);
    fake.unlockFile(HIGH_SCORES_FILE);
    assert.equal(fake.readFile(HIGH_SCORES_FILE), before);
});
