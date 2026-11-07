// ============================================================
// How often one Profile's stats read builds its Achievement sets, through
// main.js on the fake PinballY globals: once each, shared by the Player
// Level and the Achievements count, a Child Profile's non-child set
// included; a set is never kept from one read to the next.
// - Counted by table listings: each set built lists the tables several times.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold, played, MEDIEVAL } from "./household_stats_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const { fake, profileStore, readProfileStats } = await startHousehold({
    profiles: {
        Alice: {},
        Bob: { plays: { [MEDIEVAL.configId]: played(3, 1800) } },
        Kid: { isChild: true },
    },
    active: "Alice",
    addOns: ["achievements", "challenges", "tableMastery", "highScores"],
    hasAdultTable: true,
});
const { getAllAchievements } = await import("../../addons/achievements_engine.js");

// How many times run() lists the tables.
function listingsOf(run) {
    const { getAllGames } = globalThis.gameList;
    let count = 0;
    globalThis.gameList.getAllGames = () => { count += 1; return getAllGames(); };
    try {
        run();
    } finally {
        globalThis.gameList.getAllGames = getAllGames;
    }
    return count;
}

test("one Profile's stats read builds its Achievement set once", () => {
    const perSet = listingsOf(() => getAllAchievements({ profileName: "Bob" }));
    const read = listingsOf(() => readProfileStats("Bob"));
    // Built twice, the read would list the tables at least twice per set.
    assert.ok(read >= perSet && read - perSet < perSet, `${read} listings for one read, ${perSet} per set`);
});

test("a Child Profile's stats read builds its set and its non-child set once each", () => {
    const perSet = listingsOf(() => getAllAchievements({ profileName: "Kid" }));
    const perNonChildSet = listingsOf(() => getAllAchievements({ asNonChild: true }));
    const read = listingsOf(() => readProfileStats("Kid"));
    const builtOnce = perSet + perNonChildSet;
    assert.ok(read >= builtOnce && read - builtOnce < Math.min(perSet, perNonChildSet),
        `${read} listings for one read, ${perSet} per set, ${perNonChildSet} per non-child set`);
});

test("an Unlock between two reads shows on the second one", () => {
    const before = readProfileStats("Bob");
    const notified = profileStore.getNotifiedOf("Bob");
    const unlocked = getAllAchievements({ profileName: "Bob" }).find(achievement => !notified.includes(achievement.id));
    profileStore.updateProfileData(data => { data.notified.push(unlocked.id); }, "Bob");
    const after = readProfileStats("Bob");
    assert.equal(after.achievements.unlocked, before.achievements.unlocked + 1);
    assert.ok(after.playerLevel.points > before.playerLevel.points, `${after.playerLevel.points} points, ${before.playerLevel.points} before`);
});

test("a table hidden between two reads shows on the second one", () => {
    const before = readProfileStats("Bob").achievements;
    fake.setTables(globalThis.gameList.getAllGames()
        .map(game => (game.configId === MEDIEVAL.configId ? { ...game, isHidden: true } : game)));
    const after = readProfileStats("Bob").achievements;
    assert.ok(after.total < before.total, `${after.total} Achievements after hiding a table, ${before.total} before`);
    assertNoErrorLogged(fake);
});
