// ============================================================
// History Import at the Profile store's seam, on the fake file system: the
// PinballY History minus what every Profile already counted, the last-played
// rule, the import record kept through a Profile Reset, a failed save.
// ============================================================

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { setUntrackedTables } from "../../common/core/untracked_tables.js";

const NOW = new Date(2026, 10, 21, 20, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

const MEDIEVAL = {
    id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false,
    playCount: 50, playTime: 30000, lastPlayed: new Date(2026, 5, 1, 21, 30, 0),
};
const MARS = {
    id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", isHidden: false,
    playCount: 10, playTime: 3000, lastPlayed: new Date(2025, 0, 2, 10, 0, 0),
};
const NEVER = { id: 3, configId: "Never Played (2000)", title: "Never Played", isHidden: false, playCount: 0, playTime: 0 };
const MEDIA = { id: 4, configId: "Media Player", title: "Media Player", isHidden: false, playCount: 400, playTime: 90000 };
const TABLES = [MEDIEVAL, MARS, NEVER, MEDIA];

afterEach(() => setUntrackedTables(""));

function createStore(profiles) {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    for (const [name, data] of Object.entries(profiles)) fake.addFile(profileFile(name), JSON.stringify({ version: 1, ...data }));
    return { fake, store: createProfileStore(fake) };
}

const play = (count, seconds, lastPlayed) => ({ count, seconds, lastPlayed });

test("every Profile's plays, Guest's included, are taken off PinballY's, never below zero, Untracked Tables left out", () => {
    setUntrackedTables("Media Player");
    const { store } = createStore({
        guest: { plays: { [MEDIEVAL.configId]: play(5, 600, "2026-11-01T20:00:00") } },
        Alice: { plays: { [MEDIEVAL.configId]: play(3, 400, "2026-11-02T20:00:00") } },
        Bob: { plays: { [MARS.configId]: play(12, 4000, "2026-11-03T20:00:00") } },
    });

    const expected = { tableCount: 1, games: 42, seconds: 29000 };
    assert.deepEqual(store.previewHistoryImport("Alice", TABLES), expected);
    assert.deepEqual(store.importHistory("Alice", TABLES), expected);

    assert.deepEqual(store.getPlaysOf("Alice"), {
        [MEDIEVAL.configId]: play(45, 29400, "2026-11-02T20:00:00"),
    }, "Alice played it already: her last-played date stays; Mars gives nothing, Bob counted more than PinballY");
    assert.deepEqual(store.getPlayLogYearsOf("Alice"), [], "the Play Log is untouched");
});

test("PinballY's last-played date is taken only for a table the Profile had never played", () => {
    const { store } = createStore({
        Alice: {},
        Bob: { plays: { [MARS.configId]: play(4, 1000, "2026-11-03T20:00:00") } },
    });

    assert.deepEqual(store.importHistory("Alice", TABLES), { tableCount: 3, games: 456, seconds: 122000 });
    const plays = store.getPlaysOf("Alice");
    assert.deepEqual(plays[MEDIEVAL.configId], play(50, 30000, "2026-06-01T21:30:00"));
    assert.deepEqual(plays[MARS.configId], play(6, 2000, "2025-01-02T10:00:00"), "Bob's later game is not dated as hers");
    assert.deepEqual(plays[MEDIA.configId], play(400, 90000, ""), "without a date from PinballY, none");
    assert.equal(plays[NEVER.configId], undefined, "a table with nothing left is not written");
});

test("the import is recorded with its date, once per cabinet, and kept through a Profile Reset", () => {
    const { fake, store } = createStore({ Alice: {}, Bob: {} });
    assert.equal(store.getHistoryImportProfile(), null);

    store.importHistory("Bob", TABLES);
    assert.deepEqual(JSON.parse(fake.readFile(profileFile("Bob"))).historyImport, { date: "2026-11-21T20:00:00" });
    assert.equal(store.getHistoryImportProfile(), "Bob");
    assert.throws(() => store.importHistory("Alice", TABLES), /already/);

    store.resetProfile("Bob");
    assert.deepEqual(store.getPlaysOf("Bob"), {}, "the Profile Reset erases the imported totals");
    assert.equal(store.getHistoryImportProfile(), "Bob", "but keeps the record");
    assert.deepEqual(store.previewHistoryImport("Alice", TABLES).tableCount, 3);
    assert.throws(() => store.importHistory("Alice", TABLES), /already/);
});

test("the import raises the kept Collection Tier to the one its new totals reach, never lowers it", () => {
    // The tier reader sees the totals with the history already in them.
    const tierOf = data => (data.plays[MEDIEVAL.configId] ? 3 : 0);
    const savedAfterImport = (profileData, collectionTierOf) => {
        const { fake, store } = createStore({ Alice: profileData });
        store.importHistory("Alice", TABLES, { collectionTierOf });
        return JSON.parse(fake.readFile(profileFile("Alice")));
    };

    assert.equal(savedAfterImport({}, tierOf).collectionTier, 3);
    assert.equal(savedAfterImport({ collectionTier: 5 }, tierOf).collectionTier, 5, "a higher kept tier stays");
    assert.equal("collectionTier" in savedAfterImport({}, () => 0), false, "no key before a tier is reached");
});

test("the import leaves an unannounced Achievements check due, which ends by marking its Achievements Notified", () => {
    const { fake, store } = createStore({ Alice: { notified: ["first"] } });
    assert.equal(store.isUnannouncedCheckDue("Alice"), false);

    store.importHistory("Alice", TABLES);
    assert.equal(store.isUnannouncedCheckDue("Alice"), true);

    store.endUnannouncedCheck("Alice", ["first", "playTime10h"]);
    assert.equal(store.isUnannouncedCheckDue("Alice"), false);
    assert.deepEqual(JSON.parse(fake.readFile(profileFile("Alice"))).notified, ["first", "playTime10h"]);
});

test("a Profile Reset before that check leaves nothing due", () => {
    const { store } = createStore({ Alice: {} });
    store.importHistory("Alice", TABLES);
    store.resetProfile("Alice");
    assert.equal(store.isUnannouncedCheckDue("Alice"), false);
});

test("Guest never takes over the history", () => {
    const { store } = createStore({ Alice: {} });
    assert.throws(() => store.importHistory("Guest", TABLES), /Guest/);
    assert.equal(store.getHistoryImportProfile(), null);
});

test("an import that cannot be saved leaves the Profile unchanged and unrecorded", () => {
    for (const isActive of [true, false]) {
        const before = { plays: { [MARS.configId]: play(1, 100, "2026-11-03T20:00:00") } };
        const { fake, store } = createStore({ Alice: before });
        if (isActive) store.switchTo("Alice");
        const fileBefore = fake.readFile(profileFile("Alice"));
        fake.lockFile(profileFile("Alice"));

        assert.throws(() => store.importHistory("Alice", TABLES));
        assert.equal(fake.readFile(profileFile("Alice")), fileBefore);
        assert.deepEqual(store.getPlaysOf("Alice"), before.plays, `nothing in memory either (${isActive ? "active" : "other"} Profile)`);
        assert.equal(store.getHistoryImportProfile(), null);
    }
});
