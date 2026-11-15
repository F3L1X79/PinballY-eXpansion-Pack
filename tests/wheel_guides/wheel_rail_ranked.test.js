// ============================================================
// The Wheel Rail through main.js on a ranked selection: none on Most Played
// Tables and My High Scores, the Wheel Position and the Favorite Heart
// still shown; the rail comes back on an alphabetical wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, shownPosition, shownHeart, DEFAULT_ADD_ONS, PROFILES_FOLDER, TABLES } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const play = seconds => ({ count: 1, seconds, lastPlayed: "2026-10-01T20:00:00" });
const HIGH_SCORES = {
    version: 1,
    tables: { Cyclone: { board: [{ rank: 1, initials: "ALI", score: 1000, owner: "Alice" }] } },
    highScores: [],
};

test("no Wheel Rail on a ranked selection, the other guides still shown", async () => {
    const { fake } = await startWheelGuides({
        // Most Played Tables ranks only configured tables.
        tables: TABLES.map(game => ({ ...game, isConfigured: true })),
        addOns: [...DEFAULT_ADD_ONS, "hallOfFame", "highScores"],
        profiles: { Alice: { plays: { Dracula: play(3000), Cyclone: play(1000) } } },
        active: "Alice",
        files: { [`${PROFILES_FOLDER}\\high_scores.json`]: JSON.stringify(HIGH_SCORES) },
    });
    const choose = async (filterId) => {
        fake.chooseFilter(filterId);
        await settle();
        fake.advanceTime(300);
        await settle();
    };
    assert.equal(shownRail(fake).pill, "A");

    await choose("User.project.HallOfFame");
    assert.deepEqual(fake.getWheelTables().map(game => game.title), ["Dracula", "Cyclone"]);
    assert.equal(shownRail(fake), null, "Most Played Tables");
    assert.equal(shownPosition(fake), "1/2");
    assert.equal(shownHeart(fake), "grey");
    fake.moveWheel(1);
    assert.equal(shownRail(fake), null);
    fake.advanceTime(3500);
    assert.equal(shownRail(fake), null, "no slide-out left pending on a ranked selection");
    assert.equal(shownHeart(fake), "red", "Cyclone, a Favorite Table");

    await choose("User.project.MyHighScores");
    assert.equal(fake.getCurrentTable().title, "Cyclone");
    assert.equal(shownRail(fake), null, "My High Scores");
    assert.equal(shownPosition(fake), "1/1");

    await choose("All");
    assert.equal(shownRail(fake).pill, "C", "back on an alphabetical wheel");
    assertNoErrorLogged(fake);
});
