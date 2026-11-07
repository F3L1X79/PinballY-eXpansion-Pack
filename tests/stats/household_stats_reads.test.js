// ============================================================
// How often another Profile's files are read, through main.js: its stats,
// read for the Household Stats or a read-only Profile Stats, read its
// profile.json once, however many readers (Player Level, Achievements,
// Challenge, Streak, worn frame...) ask for it; a write in between is seen.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold, PROFILES, MEDIEVAL, played } from "./household_stats_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { untilHouseholdStatsFadedIn, throwAwayKeptStats, press } from "./household_stats_reader.js";
import { openProfileStats, choose } from "./profile_stats_reader.js";

const BOB_PROFILE = `${PROFILES}\\Bob\\profile.json`;

const { fake, lang, profileStore, readProfileStats } = await startHousehold({
    profiles: { Alice: {}, Bob: { plays: { [MEDIEVAL.configId]: played(3, 1800) }, playLog: ["2026-09-20T20:00:00"], avatarFrame: 1 } },
    active: "Alice",
    addOns: ["achievements", "challenges", "tableMastery", "highScores"],
    frameImages: true,
});

const readsOf = (path, run) => {
    const before = fake.fileReads().length;
    run();
    return fake.fileReads().slice(before).filter(read => read === path).length;
};

test("another Profile's stats read its profile.json once", () => {
    let stats = null;
    assert.equal(readsOf(BOB_PROFILE, () => { stats = readProfileStats("Bob"); }), 1);
    assert.equal(stats.plays.count, 3);
});

test("opening the Household Stats reads another Profile's profile.json once, its worn frame included", () => {
    // Read on the spot rather than ahead.
    openProfileStats(fake, lang);
    throwAwayKeptStats(profileStore, ["Bob"]);
    assert.equal(readsOf(BOB_PROFILE, () => {
        choose(fake, lang.profileStats.buttons.household);
        untilHouseholdStatsFadedIn(fake);
    }), 1);
    press(fake, "Exit");
    fake.advanceTime(1000);
});

test("a write between two reads is seen by the next one", () => {
    profileStore.updateProfileData(data => { data.plays[MEDIEVAL.configId] = played(5, 3000); }, "Bob");

    assert.equal(readProfileStats("Bob").plays.count, 5);
    assertNoErrorLogged(fake);
});
