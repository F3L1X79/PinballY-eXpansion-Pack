// ============================================================
// The High Score store giving back the places a Profile's Initials took
// (ADR 0026), on the fake PinballY host with a real Profile store: changed
// or cleared Initials make those places Default Scores again and drop their
// High Scores before the new Initials claim theirs, in one save.
// - A place won in a Play is never given back; a Lost Record it caused is dropped.
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

const place = (rank, initials, score, owner) => ({ rank, initials, score, owner });

// Default Scores bearing FEL and ABC, and Alice's place won in a Play bearing FEL.
const BOARDS = {
    [MM]: [place(1, "FEL", 9000, null), place(2, "ABC", 8000, null), place(3, "FEL", 7000, "Alice")],
    [AFM]: [place(1, "SLL", 6000, null), place(2, " fel", 5000, null)],
};
const ALICE_PLAY = {
    profile: "Alice", configId: MM, score: 7000, initials: "FEL", place: 3, date: "2026-11-20T20:00:00", tableRecord: false, takenFrom: null,
};

function setUp() {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0), tables: [] });
    fake.installGlobals();
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    for (const name of ["Alice", "Bob"]) fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {} }));
    const tables = Object.fromEntries(Object.entries(BOARDS).map(([configId, board]) => [configId, { board }]));
    fake.addFile(HIGH_SCORES_FILE, JSON.stringify({ version: 1, tables, highScores: [ALICE_PLAY] }));
    const profileStore = createProfileStore(fake);
    const store = createHighScoreStore(fake, profileStore);
    profileStore.setInitials("Alice", "FEL");
    store.claimInitialsPlaces("Alice");
    return { fake, profileStore, store };
}

const ownersOn = (store, configId) => store.boardOf(configId).map(({ owner }) => (owner ? owner.name : null));

test("the release preview counts the places changed or cleared Initials would give back, writing nothing", () => {
    const { fake, store } = setUp();
    const before = fake.readFile(HIGH_SCORES_FILE);

    assert.equal(store.previewInitialsRelease("Alice", "ABC"), 2);
    assert.equal(store.previewInitialsRelease("Alice", null), 2, "clearing");
    assert.equal(store.previewInitialsRelease("Alice", "FEL"), 0, "the same Initials give nothing back");
    assert.equal(store.previewInitialsRelease("Bob", "XYZ"), 0);
    assert.equal(fake.readFile(HIGH_SCORES_FILE), before);
});

test("changed Initials give back the places the old ones took, then take theirs", () => {
    const { profileStore, store } = setUp();
    profileStore.setInitials("Alice", "ABC");

    assert.deepEqual(store.claimInitialsPlaces("Alice"), { places: 1, tables: 1, givenBack: 2 });
    assert.deepEqual(ownersOn(store, MM), [null, "Alice", "Alice"], "the Play's place bearing FEL stays Alice's");
    assert.deepEqual(ownersOn(store, AFM), [null, null]);
    assert.deepEqual(store.placesHeldBy("Alice"), [{ configId: MM, bestPlace: 2 }]);
    assert.deepEqual(store.personalBoardOf(MM, "Alice").map(({ score }) => score), [8000, 7000], "the old claims' High Scores dropped");
    assert.deepEqual(store.achievementCountsOf("Alice").tableRecordTables, 0);
    const { places, tables } = store.previewInitialsClaim("FEL");
    assert.deepEqual({ places, tables }, { places: 2, tables: 2 }, "Default Scores again, for anyone's Initials");
});

test("cleared Initials give back every place they took", () => {
    const { fake, profileStore, store } = setUp();
    profileStore.clearInitials("Alice");

    assert.deepEqual(store.claimInitialsPlaces("Alice"), { places: 0, tables: 0, givenBack: 2 });
    assert.deepEqual(ownersOn(store, MM), [null, null, "Alice"]);
    assert.deepEqual(ownersOn(store, AFM), [null, null]);
    assert.deepEqual(JSON.parse(fake.readFile(HIGH_SCORES_FILE)).highScores, [ALICE_PLAY], "only the Play's High Score left");
    assert.ok(fake.logLines().some(line => line.includes(`"${MM}": place 1, 9000 (FEL) given back by Alice's former Initials, a Default Score again.`)), "each release logged");
    assert.ok(fake.logLines().some(line => line.includes(`"${AFM}": place 2, 5000 ( fel) given back by Alice's former Initials, a Default Score again.`)));
});

test("a Lost Record pending on a released Table Record is dropped", () => {
    const { profileStore, store } = setUp();
    store.markLostRecordsSeen("Alice");
    store.settlePlay(MM, [place(1, "BOB", 9500), place(2, "FEL", 9000), place(3, "ABC", 8000), place(4, "FEL", 7000)],
        { profileName: "Bob", start: new Date(2026, 10, 22, 21, 0, 0) });
    assert.equal(store.lostRecordsOf("Alice", [MM]).length, 1);
    profileStore.clearInitials("Alice");

    store.claimInitialsPlaces("Alice");

    assert.deepEqual(store.lostRecordsOf("Alice", [MM]), []);
    assert.deepEqual(ownersOn(store, MM), ["Bob", null, null, "Alice"]);
});

test("a release whose save fails throws and changes nothing", () => {
    const { fake, profileStore, store } = setUp();
    profileStore.clearInitials("Alice");
    const before = fake.readFile(HIGH_SCORES_FILE);
    fake.lockFile(HIGH_SCORES_FILE);

    assert.throws(() => store.claimInitialsPlaces("Alice"), /Permission denied/);

    assert.deepEqual(ownersOn(store, MM), ["Alice", null, "Alice"]);
    assert.deepEqual(store.placesHeldBy("Alice"), [{ configId: MM, bestPlace: 1 }, { configId: AFM, bestPlace: 2 }]);
    fake.unlockFile(HIGH_SCORES_FILE);
    assert.equal(fake.readFile(HIGH_SCORES_FILE), before);
});

test("Initials held only by a removed Profile can be taken", () => {
    const { fake, profileStore } = setUp();
    fake.removeFolder(`${PROFILES}\\Alice`);

    profileStore.setInitials("Bob", "FEL");

    assert.equal(profileStore.getInitialsOf("Bob"), "FEL");
});
