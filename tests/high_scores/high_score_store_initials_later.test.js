// ============================================================
// Places that show up later bearing a Profile's Initials (ADR 0026), on the
// fake PinballY host with a real Profile store: a first board read, a board
// changed outside a Play, a game under a minute and a ROM reset give the new
// places bearing them to that Profile, silently; a Play's places stay the Play's.
// - Only the places just given no owner are claimed, never one already known.
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
const PLAY_START = new Date(2026, 10, 22, 21, 0, 0);

const place = (rank, initials, score, owner) => ({ rank, initials, score, owner });
const read = (rank, initials, score) => ({ rank, initials, score });

// Alice holds FEL, Bob LED (a ROM's factory initials); boards: the known ones.
function setUp({ boards = {} } = {}) {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0), tables: [] });
    fake.installGlobals();
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, plays: {}, initials: "FEL" }));
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, plays: {}, initials: "LED" }));
    fake.addFile(`${PROFILES}\\Carol\\profile.json`, JSON.stringify({ version: 1, plays: {} }));
    const tables = Object.fromEntries(Object.entries(boards).map(([configId, board]) => [configId, { board }]));
    fake.addFile(HIGH_SCORES_FILE, JSON.stringify({ version: 1, tables, highScores: [] }));
    const profileStore = createProfileStore(fake);
    const store = createHighScoreStore(fake, profileStore);
    const credited = [];
    store.onCredited(name => credited.push(name));
    return { fake, profileStore, store, credited };
}

const ownersOn = (store, configId) => store.boardOf(configId).map(({ rank, owner }) => [rank, owner ? owner.name : null]);
const savedHighScores = fake => JSON.parse(fake.readFile(HIGH_SCORES_FILE)).highScores;

test("a table's first board read gives its places bearing a Profile's Initials to that Profile", async () => {
    const { fake, profileStore, store, credited } = setUp();

    await store.recordBoard(MM, [read(1, " fel", 9000), read(2, "SLL", 8000), read(3, "led", 7000)]);

    assert.deepEqual(ownersOn(store, MM), [[1, "Alice"], [2, null], [3, "Bob"]], "the others stay Default Scores");
    assert.deepEqual(store.placesHeldBy("Alice"), [{ configId: MM, bestPlace: 1 }]);
    assert.deepEqual(savedHighScores(fake)[0], {
        profile: "Alice", configId: MM, score: 9000, initials: " fel", place: 1, date: "2026-11-22T20:00:00",
        tableRecord: true, takenFrom: null, takenByInitials: true,
    });
    assert.deepEqual(credited, [], "no High Score Toast");
    assert.equal(profileStore.isUnannouncedCheckDue("Alice"), true);
    assert.equal(profileStore.isUnannouncedCheckDue("Bob"), true);
    assert.equal(profileStore.isUnannouncedCheckDue("Carol"), false);
    assert.ok(fake.logLines().some(line => line.includes(`"${MM}": first board read, 3 places, all Default Scores. Of them, 2 taken by Initials:`)));
    assert.ok(fake.logLines().some(line => line.includes(`"${MM}": place 1, 9000 ( fel) taken by the Initials FEL for Alice.`)), "each claim logged");
    assert.ok(fake.logLines().some(line => line.includes(`"${MM}": place 3, 7000 (led) taken by the Initials LED for Bob.`)));
});

test("a board read with no place bearing Initials leaves no check due", async () => {
    const { profileStore, store } = setUp();

    await store.recordBoard(MM, [read(1, "SLL", 9000)]);

    assert.deepEqual(ownersOn(store, MM), [[1, null]]);
    assert.equal(profileStore.isUnannouncedCheckDue("Alice"), false);
});

test("a board changed outside a Play gives its new places bearing Initials, never one already known", async () => {
    const { store } = setUp({ boards: { [MM]: [place(1, "FEL", 9000, "Carol"), place(2, "SLL", 8000, null)] } });

    await store.recordBoard(MM, [read(1, "FEL", 9000), read(2, "fel", 8500), read(3, "SLL", 8000)]);

    assert.deepEqual(ownersOn(store, MM), [[1, "Carol"], [2, "Alice"], [3, null]], "Carol's place bearing FEL stays hers");
    assert.deepEqual(store.placesHeldBy("Alice"), [{ configId: MM, bestPlace: 2 }]);
});

test("a game under a minute gives its new places bearing Initials to their Profile", () => {
    const { profileStore, store, credited } = setUp({ boards: { [MM]: [place(1, "SLL", 9000, null), place(2, "SLL", 8000, null)] } });

    store.settlePlay(MM, [read(1, "SLL", 9000), read(2, "FEL", 8500), read(3, "SLL", 8000)], null);

    assert.deepEqual(ownersOn(store, MM), [[1, null], [2, "Alice"], [3, null]]);
    assert.deepEqual(credited, []);
    assert.equal(profileStore.isUnannouncedCheckDue("Alice"), true);
});

test("after a ROM reset, factory places bearing a Profile's Initials are its own, and nobody loses a record", () => {
    const { store, credited } = setUp({ boards: { [AFM]: [place(1, "ALI", 9900000, "Alice"), place(2, "ALI", 9800000, "Alice")] } });
    store.markLostRecordsSeen("Alice");

    store.settlePlay(AFM, [read(1, "LED", 7500000), read(2, "SLL", 7000000), read(3, "LED", 6500000)], { profileName: "Alice", start: PLAY_START });

    assert.deepEqual(ownersOn(store, AFM), [[1, "Bob"], [2, null], [3, "Bob"]]);
    assert.deepEqual(credited, [], "the Play is credited nothing");
    assert.deepEqual(store.lostRecordsOf("Alice", [AFM]), [], "no Lost Record");
});

test("a place won in a Play is the active Profile's, Guest included, whatever Initials it bears", () => {
    const { profileStore, store } = setUp({ boards: { [MM]: [place(1, "SLL", 9000, null)], [AFM]: [place(1, "SLL", 9000, null)] } });

    store.settlePlay(MM, [read(1, "LED", 9500), read(2, "SLL", 9000)], { profileName: "Alice", start: PLAY_START });
    store.settlePlay(AFM, [read(1, "FEL", 9500), read(2, "SLL", 9000)], { profileName: "Guest", start: PLAY_START });

    assert.deepEqual(ownersOn(store, MM), [[1, "Alice"], [2, null]]);
    assert.deepEqual(store.boardOf(AFM).map(({ owner }) => owner && owner.isGuest), [true, null]);
    assert.equal(profileStore.isUnannouncedCheckDue("Bob"), false);
    assert.equal(profileStore.isUnannouncedCheckDue("Alice"), false);
});
