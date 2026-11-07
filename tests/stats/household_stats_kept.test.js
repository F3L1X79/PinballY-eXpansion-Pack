// ============================================================
// The Household Stats reopened, through main.js on the fake PinballY
// globals: each Profile's stats are kept for the session, so a reopening
// with nothing changed reads no Profile; a write reads that Profile again,
// a game, a board change, a new day or other visible tables every Profile.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold, PROFILES, MEDIEVAL, MARS, THEATRE, TWILIGHT, played } from "./household_stats_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { openHouseholdStats, columnNames, lineValues, press, throwAwayKeptStats } from "./household_stats_reader.js";

const SLOW_READ_MS = 400;
const BOB_PROFILE = `${PROFILES}\\Bob\\profile.json`;
const OPENING_LINE = /^\[HouseholdStats\] Opened in \d+ ms: read in (\d+) ms \((\d+) Profiles?: .+\), drawn in \d+ ms\.$/;
// Past every toast a game or a switch brings.
const ALL_TOASTS_MS = 600000;
const GAME_MS = 5 * 60 * 1000;
const place = (rank, owner) => ({ rank, initials: "AAA", score: 1000000 * (10 - rank), owner });

const { fake, lang, profileStore } = await startHousehold({
    profiles: {
        Alice: { plays: { [MARS.configId]: played(1, 600) } },
        Bob: { plays: { [MEDIEVAL.configId]: played(3, 1800) }, playLog: ["2026-09-22T20:00:00"] },
        Carol: {},
    },
    active: "Alice",
    addOns: ["achievements", "challenges", "tableMastery", "highScores"],
    frameImages: true,
    files: { [`${PROFILES}\\high_scores.json`]: JSON.stringify({
        version: 1, highScores: [], tables: { [THEATRE.configId]: { board: [place(1, "Alice"), place(2, "Bob")] } },
    }) },
});
const TEXT = lang.profileStats;

// Opens them from the Profile Stats, beforeChoosing() run once those are
// shown, reads what they show and the opening line, then goes back to the wheel.
function reopen(beforeChoosing = () => {}) {
    const mark = fake.logLines().length;
    const readsBefore = fake.fileReads().length;
    openHouseholdStats(fake, lang, { beforeChoosing });
    const shown = {
        names: columnNames(fake),
        gamesPlayed: lineValues(fake, TEXT.stats.gamesPlayed),
        dailyStreak: lineValues(fake, TEXT.household.lines.dailyStreak),
        collection: lineValues(fake, TEXT.household.lines.collectionMastery),
        tableRecords: lineValues(fake, TEXT.stats.tableRecordsHeld),
    };
    const lines = fake.logLines().slice(mark).filter(line => line.startsWith("[HouseholdStats] Opened"));
    assert.equal(lines.length, 1, `one opening line, got ${JSON.stringify(lines)}`);
    const [, readMs, profileCount] = lines[0].match(OPENING_LINE) || assert.fail(`unexpected line: ${lines[0]}`);
    const profileFilesRead = fake.fileReads().slice(readsBefore).filter(path => path.startsWith(PROFILES) && !path.endsWith("cabinet.json"));
    press(fake, "Exit");
    fake.advanceTime(1000);
    press(fake, "Exit");
    fake.advanceTime(1000);
    return { ...shown, readMs: Number(readMs), profileCount: Number(profileCount), profileFilesRead };
}

let first = null;

test("reopened with nothing changed, no Profile is read again and the reading time is near zero", () => {
    fake.slowDownReads(BOB_PROFILE, SLOW_READ_MS);
    // Read on the spot rather than ahead.
    first = reopen(() => throwAwayKeptStats(profileStore, ["Alice", "Bob", "Carol"]));
    assert.equal(first.profileCount, 3);
    assert.ok(first.readMs >= SLOW_READ_MS, `first read in ${first.readMs} ms`);

    const again = reopen();
    assert.equal(again.profileCount, 0);
    assert.ok(again.readMs < 50, `read again in ${again.readMs} ms`);
    assert.deepEqual(again.profileFilesRead.filter(path => path.endsWith(".json")), [], "no Profile's file read");
    assert.deepEqual({ ...again, readMs: 0, profileCount: 0, profileFilesRead: [] }, { ...first, readMs: 0, profileCount: 0, profileFilesRead: [] });
    fake.slowDownReads(BOB_PROFILE, 0);
});

test("reopened after a write to one Profile's files, only that Profile is read again", () => {
    // Right before the opening, so the reading ahead leaves it to it.
    const shown = reopen(() => profileStore.updateProfileData(data => { data.plays[MEDIEVAL.configId] = played(5, 3000); }, "Bob"));
    assert.equal(shown.profileCount, 1);
    assert.deepEqual(shown.gamesPlayed, ["1", "5", "0"]);
});

// Read again ahead, during the toasts (household_stats_read_ahead.test.js):
// the values show it.
test("after a game, every Profile is read again", () => {
    // The game list's own entry, as PinballY's launch events carry.
    const game = fake.getGameInfo(MEDIEVAL.configId);
    fake.playGame(game);
    fake.gameStarted(game);
    fake.advanceTime(GAME_MS);
    fake.gameOver(game);
    fake.advanceTime(ALL_TOASTS_MS);

    assert.deepEqual(reopen().gamesPlayed, ["2", "5", "0"]);
});

// Read again ahead, while the Profile Stats open.
test("after a board changed outside a Play, every Profile is read again", async () => {
    const { getHighScoreStore } = await import("../../common/high_scores/high_score_store.js");
    assert.deepEqual(reopen().tableRecords, ["1", "0", "0"]);
    // A new first place, a Default Score: Alice's Table Record is gone.
    await getHighScoreStore().recordBoard(THEATRE.configId, [
        { rank: 1, initials: "ZZZ", score: 99000000 }, { rank: 2, initials: "AAA", score: 9000000 }, { rank: 3, initials: "AAA", score: 8000000 },
    ]);

    assert.deepEqual(reopen().tableRecords, ["0", "0", "0"]);
});

test("on a new day, every Profile is read again", () => {
    assert.deepEqual(reopen().dailyStreak, ["1", "1", "0"], "Alice played today, Bob yesterday");
    fake.setNow(new Date(2026, 8, 25, 10, 0, 0));

    const shown = reopen();
    assert.equal(shown.profileCount, 3);
    assert.deepEqual(shown.dailyStreak, ["0", "0", "0"], "two days later, both Streaks are over");
});

test("when the visible tables change, every Profile is read again", () => {
    fake.setTables([MEDIEVAL, MARS, THEATRE]);

    const shown = reopen();
    assert.equal(shown.profileCount, 3);
    assert.deepEqual(shown.collection, ["2/3", "1/3", "0/3"]);
    fake.setTables([MEDIEVAL, MARS, THEATRE, TWILIGHT]);
    assert.deepEqual(reopen().collection, ["2/4", "1/4", "0/4"]);
});

test("a Profile created, renamed or removed shows, or no longer shows, at the next opening", () => {
    profileStore.createProfile("Dave", "Guest");
    assert.deepEqual(reopen().names, ["Alice", "Bob", "Carol", "Dave"]);

    fake.removeFolder(`${PROFILES}\\Carol`);
    fake.addFile(`${PROFILES}\\Cleo\\profile.json`, JSON.stringify({ version: 1, plays: { [MARS.configId]: played(7, 600) }, notified: [] }));
    fake.removeFolder(`${PROFILES}\\Dave`);

    const shown = reopen();
    assert.deepEqual(shown.names, ["Alice", "Bob", "Cleo"]);
    assert.equal(shown.profileCount, 1, "Cleo only");
    assert.deepEqual(shown.gamesPlayed, ["2", "5", "7"]);
    assertNoErrorLogged(fake);
});
