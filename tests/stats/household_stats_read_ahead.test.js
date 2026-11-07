// ============================================================
// The Household Stats read ahead, through main.js on the fake PinballY
// globals: every Profile's stats are read in the background after startup
// and once kept stats were thrown away, outside games and away from button
// presses, so an opening only draws, or reads what is still missing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold, PROFILES, MEDIEVAL, MARS, played } from "./household_stats_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { columnNames, lineValues, press, untilHouseholdStatsFadedIn } from "./household_stats_reader.js";
import { openProfileStats, choose } from "./profile_stats_reader.js";

const BOB_PLAY_LOG = `${PROFILES}\\Bob\\play-log-2026.json`;
const OPENING_LINE = /^\[HouseholdStats\] Opened in \d+ ms: read in (\d+) ms \((\d+) Profiles?: .+\), drawn in \d+ ms\.$/;
// Past every toast a game brings.
const ALL_TOASTS_MS = 600000;
const GAME_MS = 5 * 60 * 1000;
// Past the drawing ahead's wait after a press.
const IDLE_MS = 1000;

const { fake, lang, profileStore } = await startHousehold({
    profiles: {
        Alice: { plays: { [MARS.configId]: played(1, 600) } },
        Bob: { plays: { [MEDIEVAL.configId]: played(3, 1800) }, playLog: ["2026-09-22T20:00:00"] },
        Carol: {},
    },
    active: "Alice",
});
const TEXT = lang.profileStats;

const readsOf = (path, since) => fake.fileReads().slice(since).filter(read => read === path).length;

// Opens them from the Profile Stats, beforeChoosing() run once those are
// shown, reads what they show and the opening line, then goes back to the wheel.
function open(beforeChoosing = () => {}) {
    openProfileStats(fake, lang);
    beforeChoosing();
    const mark = fake.logLines().length;
    const readsBefore = fake.fileReads().length;
    choose(fake, TEXT.buttons.household);
    untilHouseholdStatsFadedIn(fake);
    const shown = { names: columnNames(fake), gamesPlayed: lineValues(fake, TEXT.stats.gamesPlayed) };
    const lines = fake.logLines().slice(mark).filter(line => line.startsWith("[HouseholdStats] Opened"));
    assert.equal(lines.length, 1, `one opening line, got ${JSON.stringify(lines)}`);
    const [, readMs, profileCount] = lines[0].match(OPENING_LINE) || assert.fail(`unexpected line: ${lines[0]}`);
    const profileFilesRead = fake.fileReads().slice(readsBefore)
        .filter(path => path.startsWith(PROFILES) && path.endsWith(".json") && !path.endsWith("cabinet.json"));
    press(fake, "Exit");
    fake.advanceTime(IDLE_MS);
    press(fake, "Exit");
    fake.advanceTime(IDLE_MS);
    return { ...shown, readMs: Number(readMs), profileCount: Number(profileCount), profileFilesRead };
}

test("opened once the reading ahead after startup is over, they read no Profile's files", () => {
    const shown = open();
    assert.equal(shown.profileCount, 0);
    assert.ok(shown.readMs < 50, `read in ${shown.readMs} ms`);
    assert.deepEqual(shown.profileFilesRead, []);
    assert.deepEqual(shown.names, ["Alice", "Bob", "Carol"]);
    assert.deepEqual(shown.gamesPlayed, ["1", "3", "0"]);
});

test("the reading ahead never runs during a game", () => {
    fake.playGame(MEDIEVAL);
    fake.gameStarted(MEDIEVAL);
    profileStore.updateProfileData(data => { data.plays[MEDIEVAL.configId] = played(4, 2400); }, "Bob");
    const mark = fake.fileReads().length;
    fake.advanceTime(GAME_MS);
    assert.equal(readsOf(BOB_PLAY_LOG, mark), 0, "Bob's file not read during the game");
    fake.gameOver(MEDIEVAL);
    fake.advanceTime(ALL_TOASTS_MS);
    assert.ok(readsOf(BOB_PLAY_LOG, mark) > 0, "Bob's file read once the game is over");
});

test("opened once the reading ahead after a game is over, they read no Profile's files", () => {
    const shown = open();
    assert.equal(shown.profileCount, 0);
    assert.ok(shown.readMs < 50, `read in ${shown.readMs} ms`);
    assert.deepEqual(shown.profileFilesRead, []);
    assert.deepEqual(shown.gamesPlayed, ["2", "4", "0"]);
});

test("the reading ahead never runs right after a button press", () => {
    profileStore.updateProfileData(data => { data.plays[MEDIEVAL.configId] = played(5, 3000); }, "Bob");
    const mark = fake.fileReads().length;
    for (let count = 0; count < 20; count++) {
        press(fake, "Next");
        fake.advanceTime(200);
    }
    assert.equal(readsOf(BOB_PLAY_LOG, mark), 0, "Bob's file not read while buttons are pressed");
    fake.advanceTime(IDLE_MS);
    assert.ok(readsOf(BOB_PLAY_LOG, mark) > 0, "Bob's file read once the buttons are left alone");
});

test("opened before the reading ahead is over, they read only the Profiles still missing and show the same values", () => {
    // Read by the Household Stats only, long enough to end the reading
    // ahead's slice right after Bob.
    fake.slowDownReads(BOB_PLAY_LOG, 20);
    const shown = open(() => {
        fake.advanceTime(IDLE_MS);
        profileStore.updateProfileData(data => { data.plays[MEDIEVAL.configId] = played(6, 3600); }, "Bob");
        profileStore.updateProfileData(data => { data.plays[MARS.configId] = played(2, 1200); }, "Carol");
        const mark = fake.fileReads().length;
        // One slice of the drawing ahead: Bob read ahead, not Carol.
        fake.advanceTime(10);
        assert.ok(readsOf(BOB_PLAY_LOG, mark) > 0, "Bob read ahead");
    });
    fake.slowDownReads(BOB_PLAY_LOG, 0);
    assert.equal(shown.profileCount, 1, "Carol only");
    assert.deepEqual(shown.profileFilesRead.filter(path => path.includes("\\Bob\\")), []);
    assert.deepEqual(shown.gamesPlayed, ["2", "6", "2"]);
    assertNoErrorLogged(fake);
});
