// ============================================================
// Table of the Day behaviour, through the Period Table module's interface
// with the fake PinballY host and the Profile store: which table is picked
// and kept for the whole household (locked in cabinet.json), what is
// launched, and how the active Profile's day Streak counts.
// Run with "node --test" from the project folder.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createPeriodTable, TABLE_OF_THE_DAY } from "../../common/tables/period_table.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";

// Wednesday 23 September 2026, 10:00 local time.
const NOW = new Date(2026, 8, 23, 10, 0, 0);
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const PLAYED_TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", lastPlayed: new Date(2025, 0, 1) },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", lastPlayed: new Date(2026, 5, 1) },
    { id: 3, configId: "Theatre of Magic (Bally 1995)", title: "Theatre of Magic", lastPlayed: new Date(2026, 7, 1) },
];

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET_FILE = `${PROFILES}\\cabinet.json`;
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const readJson = (fake, path) => JSON.parse(fake.readFile(path));

// A game of the given length; a Play from a minute on.
function playFor(fake, game, seconds = 60) {
    fake.gameStarted(game);
    fake.advanceTime(seconds * 1000);
    fake.gameOver(game);
}
const playLastLaunch = (fake, seconds) => playFor(fake, fake.launches().at(-1), seconds);

// lock: the Table of the Day stored in cabinet.json; streak: Guest's day
// Streak stored in its profile.json.
function createTableOfTheDay({ tables = PLAYED_TABLES, lock, streak } = {}) {
    const fake = createFakePinballYHost({ now: NOW, tables });
    if (lock) {
        fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", tableOfTheDay: lock }));
    }
    if (streak) {
        fake.addFile(profileFile("guest"), JSON.stringify({ version: 1, streaks: { tableOfTheDay: streak } }));
    }
    const profileStore = createProfileStore(fake);
    return { fake, profileStore, tableOfTheDay: createPeriodTable(fake, TABLE_OF_THE_DAY, profileStore) };
}

test("keeps the same Table of the Day all day", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();

    const morningTable = tableOfTheDay.getTable();
    fake.setNow(new Date(2026, 8, 23, 23, 59, 59));

    assert.ok(morningTable);
    assert.equal(tableOfTheDay.getTable().configId, morningTable.configId);
});

test("picks a new Table of the Day after midnight, never the previous day's table", () => {
    const twoTables = PLAYED_TABLES.slice(0, 2);
    for (const yesterdayTable of twoTables) {
        const { fake, tableOfTheDay } = createTableOfTheDay({
            tables: twoTables,
            lock: { configId: yesterdayTable.configId, period: "2026-09-22" },
        });

        const todayTable = tableOfTheDay.getTable();
        assert.notEqual(todayTable.configId, yesterdayTable.configId);

        fake.setNow(new Date(2026, 8, 24, 0, 0, 1));
        assert.equal(tableOfTheDay.getTable().configId, yesterdayTable.configId);
    }
});

test("offers the previous day's table again when it is the only visible table, and counts it in the Streak", () => {
    const onlyTable = PLAYED_TABLES[0];
    const { fake, tableOfTheDay } = createTableOfTheDay({
        tables: [onlyTable],
        lock: { configId: onlyTable.configId, period: "2026-09-22" },
        streak: { current: 1, longest: 1, lastPeriod: "2026-09-22", periodsPlayed: 1 },
    });

    tableOfTheDay.launch();
    playFor(fake, fake.launches()[0]);

    assert.deepEqual(fake.launches().map(game => game.configId), [onlyTable.configId]);
    assert.equal(tableOfTheDay.getStreak(), 2);
});

test("never picks a hidden table", () => {
    const hiddenTable = { id: 9, configId: "Hidden Table (Gottlieb 1978)", title: "Hidden Table", lastPlayed: null, isHidden: true };
    const { tableOfTheDay } = createTableOfTheDay({ tables: [hiddenTable, PLAYED_TABLES[2]] });

    assert.equal(tableOfTheDay.getTable().configId, PLAYED_TABLES[2].configId);
});

test("prefers a never-played table, otherwise the one played longest ago", () => {
    const neverPlayed = { id: 4, configId: "Homebrew Table", title: "Homebrew Table", lastPlayed: null };
    assert.equal(createTableOfTheDay({ tables: [...PLAYED_TABLES, neverPlayed] }).tableOfTheDay.getTable().configId,
        neverPlayed.configId);

    assert.equal(createTableOfTheDay().tableOfTheDay.getTable().configId, "Medieval Madness (Williams 1997)");
});

test("gives no table when the collection has none to offer", () => {
    assert.equal(createTableOfTheDay({ tables: [] }).tableOfTheDay.getTable(), null);
});

test("keeps a Table of the Day already stored for today", () => {
    const { tableOfTheDay } = createTableOfTheDay({
        lock: { configId: "Theatre of Magic (Bally 1995)", period: "2026-09-23" },
    });

    assert.equal(tableOfTheDay.getTable().configId, "Theatre of Magic (Bally 1995)");
});

test("launches the Table of the Day", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();

    tableOfTheDay.launch();

    assert.deepEqual(fake.launches().map(game => game.configId), [tableOfTheDay.getTable().configId]);
});

test("counts the day in the Streak when a Play of the Table of the Day ends", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();
    assert.equal(tableOfTheDay.getStreak(), 0);

    tableOfTheDay.launch();
    assert.equal(tableOfTheDay.getStreak(), 0, "a launch alone does not count");

    fake.gameStarted(fake.launches()[0]);
    assert.equal(tableOfTheDay.getStreak(), 0, "a game only counts once it is a Play");

    fake.advanceTime(60 * 1000);
    fake.gameOver(fake.launches()[0]);
    assert.equal(tableOfTheDay.getStreak(), 1);
});

test("a game under a minute on the Table of the Day neither starts nor extends a Streak, nor adds to Periods Played", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay({
        streak: { current: 3, longest: 3, lastPeriod: "2026-09-22", periodsPlayed: 3 },
    });

    tableOfTheDay.launch();
    playLastLaunch(fake, 59);

    assert.equal(tableOfTheDay.getStreak(), 3, "today can still extend the Streak");
    assert.equal(tableOfTheDay.getPeriodsPlayed(), 3);
    fake.advanceTime(DAY_MS);
    assert.equal(tableOfTheDay.getStreak(), 0, "the short game did not count for the day");
});

test("a Play started at 23:58 and ended after midnight counts for the day it started", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay({
        lock: { configId: "Theatre of Magic (Bally 1995)", period: "2026-09-23" },
        streak: { current: 3, longest: 3, lastPeriod: "2026-09-22", periodsPlayed: 3 },
    });
    fake.setNow(new Date(2026, 8, 23, 23, 58, 0));

    tableOfTheDay.launch();
    playLastLaunch(fake, 10 * 60);

    assert.deepEqual(readJson(fake, profileFile("guest")).streaks.tableOfTheDay,
        { current: 4, longest: 4, lastPeriod: "2026-09-23", periodsPlayed: 4 });
});

test("a Play counts for the Profile active when it started, even after a switch during the game", () => {
    const { fake, profileStore, tableOfTheDay } = createTableOfTheDay();
    fake.addFolder(`${PROFILES}\\Alice`);
    profileStore.switchTo("Alice");

    tableOfTheDay.launch();
    fake.gameStarted(fake.launches()[0]);
    profileStore.switchTo("guest");
    fake.advanceTime(60 * 1000);
    fake.gameOver(fake.launches()[0]);

    assert.equal(tableOfTheDay.getStreak(), 0);
    assert.equal(readJson(fake, profileFile("Alice")).streaks.tableOfTheDay.current, 1);
});

test("counts the Table of the Day picked by hand on the wheel, but not another table", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();
    const todayTable = tableOfTheDay.getTable();
    const otherTable = PLAYED_TABLES.find(game => game.configId !== todayTable.configId);

    fake.playGame(otherTable);
    playFor(fake, otherTable);
    assert.equal(tableOfTheDay.getStreak(), 0);

    fake.playGame(todayTable);
    playFor(fake, todayTable);
    assert.equal(tableOfTheDay.getStreak(), 1);
});

test("counts several plays in one day once", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();
    const todayTable = tableOfTheDay.getTable();

    for (let play = 0; play < 3; play++) {
        tableOfTheDay.launch();
        playFor(fake, todayTable);
        fake.advanceTime(HOUR_MS);
    }

    assert.equal(tableOfTheDay.getStreak(), 1);
});

test("does not count a failed launch", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();

    tableOfTheDay.launch();
    fake.launchError(fake.launches()[0]);

    assert.equal(tableOfTheDay.getStreak(), 0);
});

test("grows the Streak on consecutive days and resets it after a skipped day", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();
    const playToday = () => {
        tableOfTheDay.launch();
        const launches = fake.launches();
        playFor(fake, launches[launches.length - 1]);
    };

    playToday();
    fake.advanceTime(DAY_MS);
    playToday();
    assert.equal(tableOfTheDay.getStreak(), 2);

    fake.advanceTime(DAY_MS);
    assert.equal(tableOfTheDay.getStreak(), 2, "today can still extend the Streak");

    fake.advanceTime(DAY_MS);
    assert.equal(tableOfTheDay.getStreak(), 0, "a whole day was skipped");

    playToday();
    assert.equal(tableOfTheDay.getStreak(), 1);
});

test("does not count yesterday's table played today before today's is picked", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay({
        lock: { configId: "Theatre of Magic (Bally 1995)", period: "2026-09-22" },
    });
    const yesterdayTable = fake.getGameInfo("Theatre of Magic (Bally 1995)");

    fake.playGame(yesterdayTable);
    playFor(fake, yesterdayTable);

    assert.equal(tableOfTheDay.getStreak(), 0);
});

test("reads and extends a Streak stored in the active Profile", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay({
        streak: { current: 29, longest: 40, lastPeriod: "2026-09-22", periodsPlayed: 45 },
    });
    assert.equal(tableOfTheDay.getStreak(), 29);

    tableOfTheDay.launch();
    playFor(fake, fake.launches()[0]);

    assert.equal(tableOfTheDay.getStreak(), 30);
    assert.deepEqual(readJson(fake, profileFile("guest")).streaks.tableOfTheDay,
        { current: 30, longest: 40, lastPeriod: "2026-09-23", periodsPlayed: 46 });
});

test("counts the Table of the Day played by hand before anyone asked for it today", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay({ tables: [PLAYED_TABLES[0]] });

    fake.playGame(PLAYED_TABLES[0]);
    playFor(fake, PLAYED_TABLES[0]);

    assert.equal(tableOfTheDay.getStreak(), 1);
});

test("replaces a Table of the Day hidden since it was picked", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay({
        lock: { configId: "Theatre of Magic (Bally 1995)", period: "2026-09-23" },
    });
    fake.setTables(PLAYED_TABLES.map(game =>
        game.configId === "Theatre of Magic (Bally 1995)" ? { ...game, isHidden: true } : game));

    assert.notEqual(tableOfTheDay.getTable().configId, "Theatre of Magic (Bally 1995)");
});

test("never picks an unconfigured table, even one never played", () => {
    const unconfigured = { id: 9, configId: "Backup.Unconfigured", title: "Backup", lastPlayed: null, isConfigured: false };
    const { tableOfTheDay } = createTableOfTheDay({ tables: [...PLAYED_TABLES, unconfigured] });

    assert.equal(tableOfTheDay.getTable().configId, "Medieval Madness (Williams 1997)");
});

test("gives no table when every table is unconfigured", () => {
    const unconfigured = { id: 9, configId: "Backup.Unconfigured", title: "Backup", lastPlayed: null, isConfigured: false };
    const { tableOfTheDay } = createTableOfTheDay({ tables: [unconfigured] });

    assert.equal(tableOfTheDay.getTable(), null);
});

test("replaces a Table of the Day no longer configured, as one hidden since it was picked", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay({
        lock: { configId: "Theatre of Magic (Bally 1995)", period: "2026-09-23" },
    });
    fake.setTables(PLAYED_TABLES.map(game =>
        game.configId === "Theatre of Magic (Bally 1995)" ? { ...game, isConfigured: false } : game));

    assert.notEqual(tableOfTheDay.getTable().configId, "Theatre of Magic (Bally 1995)");
    assert.notEqual(readJson(fake, CABINET_FILE).tableOfTheDay.configId, "Theatre of Magic (Bally 1995)");
});

test("counts a day once in Periods Played, however many times the Table of the Day is played", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();
    assert.equal(tableOfTheDay.getPeriodsPlayed(), 0);

    for (let play = 0; play < 3; play++) {
        tableOfTheDay.launch();
        const launches = fake.launches();
        playFor(fake, launches[launches.length - 1]);
        fake.advanceTime(HOUR_MS);
    }

    assert.equal(tableOfTheDay.getPeriodsPlayed(), 1);
    assert.equal(tableOfTheDay.getLongestStreak(), 1);
});

test("counts non-consecutive days in Periods Played, while the longest Streak keeps its record", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();
    const playToday = () => {
        tableOfTheDay.launch();
        const launches = fake.launches();
        playFor(fake, launches[launches.length - 1]);
    };

    playToday();
    fake.advanceTime(DAY_MS);
    playToday();
    fake.advanceTime(3 * DAY_MS);
    playToday();

    assert.equal(tableOfTheDay.getPeriodsPlayed(), 3);
    assert.equal(tableOfTheDay.getLongestStreak(), 2);
});

test("locks the Table of the Day in cabinet.json, never in PinballY's settings", () => {
    const { fake, tableOfTheDay } = createTableOfTheDay();

    const todayTable = tableOfTheDay.getTable();
    tableOfTheDay.launch();
    fake.gameStarted(todayTable);

    assert.deepEqual(readJson(fake, CABINET_FILE).tableOfTheDay, { configId: todayTable.configId, period: "2026-09-23" });
    assert.deepEqual([...fake.writtenSettingsKeys()], []);
});

test("two Profiles see the same Table of the Day, and a play extends only the active Profile's Streak", () => {
    const { fake, profileStore, tableOfTheDay } = createTableOfTheDay({
        lock: { configId: "Theatre of Magic (Bally 1995)", period: "2026-09-23" },
    });
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFolder(`${PROFILES}\\Bob`);

    profileStore.switchTo("Alice");
    const aliceTable = tableOfTheDay.getTable();
    tableOfTheDay.launch();
    playFor(fake, aliceTable);

    profileStore.switchTo("Bob");
    assert.equal(tableOfTheDay.getTable().configId, aliceTable.configId);
    assert.equal(tableOfTheDay.getStreak(), 0);
    assert.equal(tableOfTheDay.getPeriodsPlayed(), 0);

    profileStore.switchTo("Alice");
    assert.equal(tableOfTheDay.getStreak(), 1);
    assert.equal(tableOfTheDay.getPeriodsPlayed(), 1);
});

test("keeps choosing from PinballY's own play stats, whatever the active Profile played", () => {
    const neverPlayed = { id: 4, configId: "Homebrew Table", title: "Homebrew Table", lastPlayed: null };
    const fake = createFakePinballYHost({ now: NOW, tables: [...PLAYED_TABLES, neverPlayed] });
    // Guest played the table PinballY never recorded: it stays the household's pick.
    fake.addFile(profileFile("guest"), JSON.stringify({
        version: 1, plays: { [neverPlayed.configId]: { count: 4, seconds: 900, lastPlayed: "2026-09-22T20:00:00" } },
    }));
    const tableOfTheDay = createPeriodTable(fake, TABLE_OF_THE_DAY, createProfileStore(fake));

    assert.equal(tableOfTheDay.getTable().configId, neverPlayed.configId);
});
