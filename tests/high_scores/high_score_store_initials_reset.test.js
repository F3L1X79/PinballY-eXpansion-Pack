// ============================================================
// The places a Profile's Initials took after a Profile Reset (ADR 0026), on
// the fake PinballY host with a real Profile store and a seeded
// high_scores.json: they keep counting on the Household and Personal Boards,
// My High Scores and the Achievements, while its other High Scores do not.
// - The first Achievements check after such a reset is unannounced.
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

// Default Scores bearing FEL on both tables, and a place Alice won in a Play
// on Attack from Mars.
const BOARDS = {
    [MM]: { board: [place(1, "FEL", 9000, null), place(2, "SLL", 8000, null)] },
    [AFM]: { board: [place(1, "ALI", 7000, "Alice"), place(2, "FEL", 5000, null)] },
};
const PLAY_HIGH_SCORE = {
    profile: "Alice", configId: AFM, score: 7000, initials: "ALI", place: 1,
    date: "2026-11-01T20:00:00", tableRecord: true, takenFrom: null,
};

function setUp() {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0), tables: [] });
    fake.installGlobals();
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, plays: {} }));
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, plays: {} }));
    fake.addFile(HIGH_SCORES_FILE, JSON.stringify({ version: 1, tables: BOARDS, highScores: [PLAY_HIGH_SCORE] }));
    const profileStore = createProfileStore(fake);
    const store = createHighScoreStore(fake, profileStore);
    return { fake, profileStore, store };
}

// Alice's Initials take their places, then a later day she is reset.
function claimThenReset(fake, profileStore, store) {
    profileStore.setInitials("Alice", "FEL");
    store.claimInitialsPlaces("Alice");
    fake.advanceTime(24 * 60 * 60 * 1000);
    profileStore.endUnannouncedCheck("Alice", []);
    profileStore.resetProfile("Alice");
}

test("after a Profile Reset, the Household and Personal Boards count the places the Initials took, and no other former High Score", () => {
    const { fake, profileStore, store } = setUp();
    claimThenReset(fake, profileStore, store);

    assert.deepEqual(store.householdBoardOf(MM).map(({ score, owner }) => [score, owner.name]), [[9000, "Alice"]]);
    assert.deepEqual(store.householdBoardOf(AFM).map(({ score, owner }) => [score, owner.name]), [[5000, "Alice"]],
        "the Play's 7000 won before the reset no longer counts");
    assert.deepEqual(store.personalBoardOf(AFM, "Alice").map(({ rank, score }) => [rank, score]), [[1, 5000]]);
});

test("after a Profile Reset, My High Scores still has the places the Initials took", () => {
    const { fake, profileStore, store } = setUp();
    claimThenReset(fake, profileStore, store);

    assert.deepEqual(store.placesHeldBy("Alice"), [{ configId: MM, bestPlace: 1 }, { configId: AFM, bestPlace: 1 }]);
});

test("after a Profile Reset, the High Scores Achievements count the places the Initials took, unannounced", () => {
    const { fake, profileStore, store } = setUp();
    claimThenReset(fake, profileStore, store);

    assert.deepEqual(store.achievementCountsOf("Alice"), {
        highScoreTables: 2, tableRecordTables: 1, tookTableRecord: false, tookGrownUpTableRecord: false,
    });
    assert.equal(profileStore.isUnannouncedCheckDue("Alice"), true);
});

test("a Profile Reset without places taken by Initials leaves no unannounced check due", () => {
    const { profileStore } = setUp();
    profileStore.resetProfile("Alice");
    profileStore.resetProfile("Bob");

    assert.equal(profileStore.isUnannouncedCheckDue("Alice"), false);
    assert.equal(profileStore.isUnannouncedCheckDue("Bob"), false);
});
