// ============================================================
// Pinning test: plays a scripted session through main.js and locks every
// persisted key and Achievement ID (profile.json, cabinet.json, Challenges,
// Play Log, World Tour, Avatar Frame, Table ROMs, High Scores, .env.local's OFFER_VPXTOOL).
// - These strings are players' saved progress: this test must keep passing unchanged.
// - The Surprises part's keys are in persisted_data_pinning_surprises.test.js.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config, { DEFAULTS } from "../../common/core/config.js";
import { applyEnvOverrides } from "../../common/core/env_overrides.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createPeriodTable, formatDateKey, TABLE_OF_THE_DAY, TABLE_OF_THE_WEEK } from "../../common/tables/period_table.js";
import { createRandomGame } from "../../common/tables/random_game.js";
import { createChallenges, CHALLENGE_TEMPLATE_IDS } from "../../common/challenges/challenge.js";
import { buildChallengeAchievements } from "../../achievements/challenges.js";
import { buildWorldTourAchievements } from "../../achievements/world_tour.js";
import { createWorldTour } from "../../common/achievements/world_tour.js";
import { createProfileRewards } from "../../common/avatar_frames/profile_rewards.js";
import { createTableRomRecord } from "../../common/table_roms/table_rom_record.js";
import { createScriptQueue } from "../../common/table_roms/script_queue.js";
import { createNvConfirmation } from "../../common/table_roms/nv_confirmation.js";
import { createScriptReaderState } from "../../common/table_roms/script_reader_state.js";
import { createHighScoreStore } from "../../common/high_scores/high_score_store.js";
import { buildHighScoreAchievements } from "../../achievements/high_scores.js";
import { WELCOME_SCREEN_FADE_IN_MS, choose, openFromMainMenu } from "../welcome_screen/welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Wednesday 23 September 2026, 10:00 local time: its week starts Monday 21.
const NOW = new Date(2026, 8, 23, 10, 0, 0);
const SECONDS_PER_HOUR = 3600;

const TABLES = [
    {
        id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness (Williams 1997)",
        manufacturer: "Williams", year: 1997, categories: ["Fantasy"], system: { displayName: "Visual Pinball X" },
        playCount: 5, playTime: 60 * SECONDS_PER_HOUR, lastPlayed: new Date(2025, 0, 1), rating: 4, isHidden: false,
    },
    {
        id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars (Bally 1995)",
        manufacturer: "Bally", year: 1995, categories: ["SciFi", "Classic"], system: { displayName: "Visual Pinball X" },
        playCount: 3, playTime: 50 * SECONDS_PER_HOUR, lastPlayed: new Date(2026, 5, 1), rating: 5, isHidden: false,
    },
    {
        id: 3, configId: "Space Trip (VPX Community 2021)", title: "Space Trip (VPX Community 2021)",
        // Gives each category its second table: one table gives no Category Achievement.
        manufacturer: "VPX Community", year: 2021, categories: ["Fantasy", "SciFi", "Classic"],
        // Its own System: the collection spans two, for the System Achievements.
        system: { displayName: "Pinball FX" },
        playCount: 1, playTime: 100, lastPlayed: new Date(2026, 7, 1), rating: 3, isHidden: false,
    },
    {
        id: 4, configId: "Homebrew Table", title: "Homebrew Table",
        manufacturer: "", year: 0, categories: [],
        playCount: 2, playTime: 200, lastPlayed: new Date(2026, 8, 1), rating: 2, isHidden: false,
    },
    // Hidden: must produce no Gottlieb, 1970s, "Retro" or Future Pinball achievement.
    {
        id: 5, configId: "Hidden Table (Gottlieb 1978)", title: "Hidden Table (Gottlieb 1978)",
        manufacturer: "Gottlieb", year: 1978, categories: ["Retro"], system: { displayName: "Future Pinball" },
        playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: true,
    },
];

const EXPECTED_ACHIEVEMENT_IDS = [
    "cabinetStreak:15",
    "cabinetStreak:3",
    "cabinetStreak:30",
    "cabinetStreak:7",
    "categoryCompletion:Classic",
    "categoryCompletion:Fantasy",
    "categoryCompletion:SciFi",
    "collectionMilestone:100percent",
    "collectionMilestone:10percent",
    "collectionMilestone:25percent",
    "collectionMilestone:50percent",
    "collectionMilestone:75percent",
    "collectionMilestone:firstTable",
    "dayManufacturers:10",
    "dayManufacturers:3",
    "dayManufacturers:5",
    "dayManufacturers:8",
    "decadeCompletion:1990s",
    "decadeCompletion:2020s",
    "everySystem",
    "grandReturn",
    "manufacturerCompletion:Bally",
    "manufacturerCompletion:VPX Community",
    "manufacturerCompletion:Williams",
    "marathon:30",
    "marathon:60",
    "playTimeMilestone:100h",
    "playTimeMilestone:10h",
    "playTimeMilestone:1h",
    "playTimeMilestone:50h",
    "playTimeMilestone:5h",
    "rageQuit",
    "randomGames:10",
    "randomGames:100",
    "randomGames:25",
    "randomGames:50",
    "systemCompletion:Pinball FX",
    "systemCompletion:Visual Pinball X",
    "tableOfTheDayFirstPlay",
    "tableOfTheDayPeriodsPlayed:10",
    "tableOfTheDayPeriodsPlayed:100",
    "tableOfTheDayPeriodsPlayed:25",
    "tableOfTheDayPeriodsPlayed:50",
    "tableOfTheDayStreak:14",
    "tableOfTheDayStreak:3",
    "tableOfTheDayStreak:30",
    "tableOfTheDayStreak:7",
    "tableOfTheWeekFirstPlay",
    "tableOfTheWeekPeriodsPlayed:10",
    "tableOfTheWeekPeriodsPlayed:26",
    "tableOfTheWeekPeriodsPlayed:4",
    "tableOfTheWeekPeriodsPlayed:52",
    "tableOfTheWeekStreak:12",
    "tableOfTheWeekStreak:4",
];

// Enough for every waiting Achievement Toast to show, one after the other.
const TOASTS_MS = 60 * 60 * 1000;
const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const GUEST_PROFILE_FILE = `${PROFILES_FOLDER}\\guest\\profile.json`;
// Guest's play record before the session matches PinballY's play counts and
// play times of the visible tables, so every completion and play-time
// Achievement is in reach, but every table was last played two years ago,
// for the grand return (in the Profile store's local time format).
const SEEDED_PLAYS = Object.fromEntries(TABLES.filter(table => !table.isHidden).map(table =>
    [table.configId, { count: table.playCount, seconds: table.playTime, lastPlayed: "2024-09-01T20:00:00" }]));
// Nine manufacturers outside the collection already played today: any
// manufacturer played next unlocks the last multi-manufacturer Achievement.
const SEEDED_DAY_MANUFACTURERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const SEEDED_SESSIONS = {
    longestSeconds: 0, shortestSeconds: 0, rageQuit: false, grandReturn: false,
    dayManufacturers: { day: "2026-09-23", list: SEEDED_DAY_MANUFACTURERS }, mostManufacturersInADay: 9,
};

// A Play every day of the 30 days up to yesterday: every Daily Streak
// Achievement is already reached.
const SEEDED_PLAY_LOG = {
    version: 1,
    plays: Array.from({ length: 30 }, (_, index) => ({
        start: `${formatDateKey(new Date(2026, 7, 24 + index))}T21:00:00`, configId: "Seeded Table (Williams 1990)", seconds: 600,
    })),
};

// One Period short of the longest Streak and Periods Played Achievements.
const SEEDED_STREAKS = {
    tableOfTheDay: { current: 29, longest: 29, lastPeriod: "2026-09-22", periodsPlayed: 99 },
    tableOfTheWeek: { current: 11, longest: 11, lastPeriod: "2026-09-14", periodsPlayed: 51 },
};

// The add-ons involved in persisted data; the others would need more
// PinballY globals and write nothing that is pinned here.
const ADD_ONS_UNDER_TEST = ["customMenuCommands", "sessionStatsTracker", "achievements", "ratingPrompt", "startupChoicePrompt"];

// Fixed here so the pinned IDs don't depend on the player's configuration;
// changing the shared config object is safe since each test file runs in
// its own process.
function useFixtureConfig() {
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    }
    config.language = "en";
    // The fake has no wheel buttons to animate.
    config.skipRandomGameAnimation = true;
}

async function playLastLaunch(fake, durationSeconds) {
    const launches = fake.launches();
    const game = launches[launches.length - 1];
    fake.gameStarted(game);
    await settle();
    fake.advanceTime(durationSeconds * 1000);
    fake.gameOver(game);
    await settle();
    return game;
}

async function closeEveryDialog(fake) {
    for (let guard = 0; fake.currentMenu() && guard < 100; guard++) {
        fake.closeMenu();
        await settle();
    }
    assert.equal(fake.currentMenu(), null, "dialogs kept opening");
}

test("persisted files and Achievement IDs stay byte-identical", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(GUEST_PROFILE_FILE, JSON.stringify({
        version: 1, plays: SEEDED_PLAYS, streaks: SEEDED_STREAKS,
        // One Random Game short of the last Random Game fan Achievement.
        randomGames: 99,
        sessions: SEEDED_SESSIONS, notified: [],
    }));
    fake.addFile(`${PROFILES_FOLDER}\\guest\\play-log-2026.json`, JSON.stringify(SEEDED_PLAY_LOG));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();

    useFixtureConfig();
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();

    // Welcome Screen, once faded in (the pinned times keep their second):
    // launch the Table of the Day from its card, play a long session, and
    // close every dialog (the rating prompt).
    fake.advanceTime(WELCOME_SCREEN_FADE_IN_MS + 300);
    choose(fake, lang.welcomeScreen.periodCards.day.period);
    await settle();
    const dayTable = await playLastLaunch(fake, 61 * 60);
    await closeEveryDialog(fake);

    // The Welcome Screen from the main menu: launch the Table of the Week
    // and give up after 45 seconds.
    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    choose(fake, lang.welcomeScreen.periodCards.week.period);
    await settle();
    const weekTable = await playLastLaunch(fake, 45);
    await closeEveryDialog(fake);

    // From the main menu again: the Table of the Week, played for a minute
    // this time, so its Period counts.
    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    choose(fake, lang.welcomeScreen.periodCards.week.period);
    await settle();
    await playLastLaunch(fake, 60);
    await closeEveryDialog(fake);

    // From the main menu again: a Random Game, played for a minute.
    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    choose(fake, lang.welcomeScreen.randomTable);
    await settle();
    const randomTable = await playLastLaunch(fake, 60);
    await closeEveryDialog(fake);

    // Achievements are Notified when their toast starts, one toast after the other.
    fake.advanceTime(TOASTS_MS);

    // Nothing of the add-ons' own data in PinballY's settings any more.
    assert.deepEqual([...fake.writtenSettingsKeys()], []);

    // Every Play for Guest, the only Profile of a fresh install (the
    // 45-second game is not one), and every Achievement Notified for Guest
    // (in the order the toasts showed).
    const expectedPlays = structuredClone(SEEDED_PLAYS);
    for (const [game, seconds, lastPlayed] of [
        [dayTable, 61 * 60, "2026-09-23T11:01:00"],
        [weekTable, 60, "2026-09-23T11:02:47"],
        [randomTable, 60, "2026-09-23T11:03:48"],
    ]) {
        const play = expectedPlays[game.configId];
        expectedPlays[game.configId] = { count: play.count + 1, seconds: play.seconds + seconds, lastPlayed };
    }
    const guestProfile = JSON.parse(fake.readFile(GUEST_PROFILE_FILE));
    assert.deepEqual(Object.keys(guestProfile), ["version", "plays", "streaks", "randomGames", "sessions", "notified", "surprises"]);
    assert.equal(guestProfile.version, 1);
    assert.deepEqual(guestProfile.plays, expectedPlays);
    // Both Period Tables played in the Period right after their last one.
    assert.deepEqual(guestProfile.streaks, {
        tableOfTheDay: { current: 30, longest: 30, lastPeriod: "2026-09-23", periodsPlayed: 100 },
        tableOfTheWeek: { current: 12, longest: 12, lastPeriod: "2026-09-21", periodsPlayed: 52 },
    });
    // The manufacturers of the tables played, in play order, once each.
    const dayManufacturers = [...new Set([...SEEDED_DAY_MANUFACTURERS,
        ...[dayTable, weekTable, randomTable].map(game => game.manufacturer).filter(Boolean)])];
    assert.equal(guestProfile.randomGames, 100);
    assert.deepEqual(guestProfile.sessions, {
        longestSeconds: 61 * 60,
        // The shortest Play: the 45-second game is not one.
        shortestSeconds: 60,
        rageQuit: true,
        grandReturn: true,
        dayManufacturers: { day: "2026-09-23", list: dayManufacturers },
        mostManufacturersInADay: dayManufacturers.length,
    });
    assert.deepEqual([...guestProfile.notified].sort(), EXPECTED_ACHIEVEMENT_IDS);
    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\cabinet.json`)), {
        version: 1,
        activeProfile: "guest",
        tableOfTheDay: { configId: dayTable.configId, period: "2026-09-23" },
        tableOfTheWeek: { configId: weekTable.configId, period: "2026-09-21" },
    });

    assertNoErrorLogged(fake);
});

test("the Challenges' saved data stays byte-identical", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFolder(`${PROFILES_FOLDER}\\Alice`);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    const store = createProfileStore(fake);
    const tableOfTheDay = createPeriodTable(fake, TABLE_OF_THE_DAY, store);
    const tableOfTheWeek = createPeriodTable(fake, TABLE_OF_THE_WEEK, store);
    const randomGame = createRandomGame(fake, store, { animateTo: async () => {}, skipAnimation: true });
    // Always the first choice and the lowest target.
    const challenges = createChallenges(fake, store, { tableOfTheDay, tableOfTheWeek, randomGame, random: () => 0 });
    challenges.showUp();

    const game = TABLES[0];
    fake.gameStarted(game);
    fake.advanceTime(90 * 1000);
    fake.gameOver(game);

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\cabinet.json`)).challenge, {
        current: { week: "2026-09-21", template: "differentTables", param: null, target: 4 },
        previous: null,
    });
    const { challenge } = JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\Alice\\profile.json`));
    // The Period Tables are drawn with Math.random: their two facts are
    // pinned by name only.
    const [counted] = challenge.games;
    assert.equal(typeof counted.isTableOfTheDay, "boolean");
    assert.equal(typeof counted.isTableOfTheWeek, "boolean");
    assert.deepEqual({ ...challenge, games: [{ ...counted, isTableOfTheDay: null, isTableOfTheWeek: null }] }, {
        firstWeek: "2026-09-21",
        week: "2026-09-21",
        games: [{
            configId: game.configId,
            manufacturer: "Williams",
            decade: 1990,
            day: "2026-09-23",
            seconds: 90,
            randomGame: false,
            isTableOfTheDay: null,
            isTableOfTheWeek: null,
            wasNeverPlayed: true,
            wasDusty: false,
        }],
        completed: false,
        completedCount: 0,
        judgedWeek: "",
        history: [],
    });
    assert.deepEqual(Object.keys(challenge), ["firstWeek", "week", "games", "completed", "completedCount", "judgedWeek", "history"]);

    // A week where no template is feasible: no visible table.
    const empty = createFakePinballYHost({ now: NOW, tables: [{ ...TABLES[0], isHidden: true }] });
    empty.addFolder(`${PROFILES_FOLDER}\\Alice`);
    empty.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    const emptyStore = createProfileStore(empty);
    createChallenges(empty, emptyStore, {
        tableOfTheDay: createPeriodTable(empty, TABLE_OF_THE_DAY, emptyStore),
        tableOfTheWeek: createPeriodTable(empty, TABLE_OF_THE_WEEK, emptyStore),
        randomGame: createRandomGame(empty, emptyStore, { animateTo: async () => {}, skipAnimation: true }),
        random: () => 0,
    }).showUp();
    assert.deepEqual(JSON.parse(empty.readFile(`${PROFILES_FOLDER}\\cabinet.json`)).challenge, {
        current: { week: "2026-09-21", template: "", param: null, target: 0 },
        previous: null,
    });
});

test("a verdict on the previous Challenge stays byte-identical in the Profile's history", () => {
    // Monday 28 September 2026: last week's Challenge is judged.
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 28, 10, 0, 0), tables: TABLES });
    fake.addFolder(`${PROFILES_FOLDER}\\Alice`);
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\profile.json`, JSON.stringify({
        challenge: {
            firstWeek: "2026-09-21", week: "2026-09-21", games: [], completed: false,
            completedCount: 0, judgedWeek: "", history: [],
        },
    }));
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({
        version: 1,
        activeProfile: "Alice",
        challenge: {
            current: { week: "2026-09-28", template: "differentTables", param: null, target: 3 },
            previous: { week: "2026-09-21", template: "differentTables", param: null, target: 2 },
        },
    }));
    const store = createProfileStore(fake);
    createChallenges(fake, store, {
        tableOfTheDay: createPeriodTable(fake, TABLE_OF_THE_DAY, store),
        tableOfTheWeek: createPeriodTable(fake, TABLE_OF_THE_WEEK, store),
        randomGame: createRandomGame(fake, store, { animateTo: async () => {}, skipAnimation: true }),
        random: () => 0,
    }).showUp();

    const { challenge } = JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\Alice\\profile.json`));
    assert.equal(challenge.judgedWeek, "2026-09-21");
    assert.deepEqual(challenge.history, [
        { week: "2026-09-21", template: "differentTables", param: null, target: 2, reached: 0, completed: false },
    ]);
    assert.deepEqual(Object.keys(challenge.history[0]), ["week", "template", "param", "target", "reached", "completed"]);
});

test("the Admin Profile mark keeps its key in profile.json", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    const store = createProfileStore(fake);
    store.switchTo("Alice");
    store.updateProfileData(data => { data.randomGames += 1; });

    assert.equal(store.isAdmin(), true);
    assert.equal(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\Alice\\profile.json`)).isAdmin, true);
});

test("the Child Profile mark keeps its key in profile.json", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\profile.json`, JSON.stringify({ version: 1, isChild: true }));
    const store = createProfileStore(fake);
    store.switchTo("Alice");
    store.updateProfileData(data => { data.randomGames += 1; });

    assert.equal(store.isChild(), true);
    assert.equal(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\Alice\\profile.json`)).isChild, true);
});

test("the Play Log keeps its file name and keys", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    createProfileStore(fake);
    fake.gameStarted(TABLES[0]);
    fake.advanceTime(90 * 1000);
    fake.gameOver(TABLES[0]);

    const playLog = JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\guest\\play-log-2026.json`));
    assert.deepEqual(Object.keys(playLog), ["version", "plays"]);
    assert.equal(playLog.version, 1);
    assert.deepEqual(playLog.plays, [{ start: "2026-09-23T10:00:00", configId: TABLES[0].configId, seconds: 90 }]);
    assert.deepEqual(Object.keys(playLog.plays[0]), ["start", "configId", "seconds"]);
});

test("the adult Periods of a Period Table keep their key next to its lock in cabinet.json", () => {
    const adultTable = { ...TABLES[0], categories: ["NSFW"] };
    const fake = createFakePinballYHost({ now: NOW, tables: [adultTable] });
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({
        version: 1,
        activeProfile: "guest",
        tableOfTheDay: { configId: adultTable.configId, period: "2026-09-22", adultPeriods: ["2026-09-22"] },
    }));
    const store = createProfileStore(fake);
    createPeriodTable(fake, TABLE_OF_THE_DAY, store).getTable();

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\cabinet.json`)).tableOfTheDay, {
        configId: adultTable.configId,
        period: "2026-09-23",
        adultPeriods: ["2026-09-22", "2026-09-23"],
    });
});

test("the Challenge template ids stay byte-identical", () => {
    for (const id of ["differentTables", "manufacturerTables", "decadeTables", "differentManufacturers", "differentDecades",
        "neverPlayedTables", "dustyTables", "tableOfTheDayDays", "tableOfTheWeekGames", "activeDays",
        "endurance", "marathon", "randomGames", "sameTableGames"]) {
        assert.ok(CHALLENGE_TEMPLATE_IDS.includes(id), `${id} is still a Challenge template`);
    }
});

test("the Challenges Achievement IDs stay byte-identical", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFolder(`${PROFILES_FOLDER}\\Alice`);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    const store = createProfileStore(fake);
    const challenges = createChallenges(fake, store, {
        tableOfTheDay: createPeriodTable(fake, TABLE_OF_THE_DAY, store),
        tableOfTheWeek: createPeriodTable(fake, TABLE_OF_THE_WEEK, store),
        randomGame: createRandomGame(fake, store, { animateTo: async () => {}, skipAnimation: true }),
        random: () => 0,
    });

    assert.deepEqual(buildChallengeAchievements(challenges).map(achievement => achievement.id), [
        "challengesCompleted:1",
        "challengesCompleted:5",
        "challengesCompleted:10",
        "challengesCompleted:25",
        "challengesCompleted:50",
        "challengesCompleted:100",
    ]);
});

test("the World Tour keeps its key in profile.json and its Achievement ID", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    const store = createProfileStore(fake);
    createWorldTour(fake, store, { onCompleted: () => {} });
    for (let move = 0; move < TABLES.length; move++) fake.moveWheel(1);

    assert.equal(JSON.parse(fake.readFile(GUEST_PROFILE_FILE)).worldTour, true);
    assert.deepEqual(buildWorldTourAchievements().map(achievement => achievement.id), ["worldTour"]);
});

test("the Avatar Frame choice keeps its key in profile.json", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(GUEST_PROFILE_FILE, JSON.stringify({ version: 1, collectionTier: 2 }));
    const profileRewards = createProfileRewards(fake, { profileStore: createProfileStore(fake) });

    profileRewards.choose(2);
    assert.equal(JSON.parse(fake.readFile(GUEST_PROFILE_FILE)).avatarFrame, 2);
    profileRewards.choose(null);
    assert.equal(JSON.parse(fake.readFile(GUEST_PROFILE_FILE)).avatarFrame, null);
});

test("a Holiday Frame choice keeps its text id in avatarFrame", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(GUEST_PROFILE_FILE, JSON.stringify({ version: 1 }));
    fake.addFile(GUEST_PROFILE_FILE.replace("profile.json", "play-log-2026.json"), JSON.stringify({
        version: 1, plays: [{ start: "2026-12-24T20:00:00", configId: TABLES[0].configId, seconds: 600 }],
    }));
    const profileRewards = createProfileRewards(fake, { profileStore: createProfileStore(fake) });

    profileRewards.choose("christmas");
    assert.equal(JSON.parse(fake.readFile(GUEST_PROFILE_FILE)).avatarFrame, "christmas");
});

test("the Table ROM record keeps its file name and keys", () => {
    const vpx = "C:\\Visual Pinball\\Tables\\Attack from Mars (Bally 1995).vpx";
    const vbs = "C:\\Visual Pinball\\Tables\\Attack from Mars (Bally 1995).vbs";
    const noRom = "C:\\Visual Pinball\\Tables\\Space Trip (VPX Community 2021).vpx";
    const fake = createFakePinballYHost({
        now: NOW,
        tables: [
            { configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", gameFile: vpx, isHidden: false },
            { configId: "Space Trip (VPX Community 2021)", title: "Space Trip", gameFile: noRom, isHidden: false },
        ],
    });
    fake.addFile(vpx, "table", { modified: new Date(2026, 5, 1, 12, 0, 0) });
    fake.addFile(vbs, "patched", { modified: new Date(2026, 5, 2, 12, 0, 0) });
    fake.addFile(noRom, "table", { modified: new Date(2026, 5, 3, 12, 0, 0) });
    fake.addProgram("C:\\PinballY\\Scripts\\ExpansionPack\\tools\\vpxtool.exe", args => ({ output: args[1] === vpx ? "afm_113\n" : "" }));

    createScriptQueue(fake, createTableRomRecord(fake, createProfileStore(fake))).start();
    fake.advanceTime(60 * 1000);

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\table_roms.json`)), {
        version: 1,
        tables: {
            "Attack from Mars (Bally 1995)": {
                script: {
                    vpx: { modified: new Date(2026, 5, 1, 12, 0, 0).getTime(), size: 5 },
                    vbs: { modified: new Date(2026, 5, 2, 12, 0, 0).getTime(), size: 7 },
                    rom: "afm_113",
                },
                written: { rom: "afm_113", source: "script" },
            },
            "Space Trip (VPX Community 2021)": {
                script: { vpx: { modified: new Date(2026, 5, 3, 12, 0, 0).getTime(), size: 5 }, vbs: null, rom: null },
            },
        },
    });
});

test("the Table ROM record keeps the keys of a table vpxtool failed on", () => {
    const vpx = "C:\\Visual Pinball\\Tables\\New Table (Stern 2026).vpx";
    const vpxtool = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\vpxtool.exe";
    const fake = createFakePinballYHost({
        now: NOW,
        tables: [{ configId: "New Table (Stern 2026)", title: "New Table", gameFile: vpx, isHidden: false }],
    });
    fake.addFile(vpx, "table", { modified: new Date(2026, 5, 1, 12, 0, 0) });
    fake.addProgram(vpxtool, args => (args[0] === "--version" ? { output: "vpxtool git:v0.38.0\n" } : { exitCode: 1, output: "" }),
        { modified: new Date(2026, 5, 4, 12, 0, 0) });

    createScriptQueue(fake, createTableRomRecord(fake, createProfileStore(fake))).start();
    fake.advanceTime(60 * 1000);

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\table_roms.json`)), {
        version: 1,
        tables: {
            "New Table (Stern 2026)": {
                scriptFailure: {
                    vpx: { modified: new Date(2026, 5, 1, 12, 0, 0).getTime(), size: 5 },
                    vbs: null,
                    vpxtool: { modified: new Date(2026, 5, 4, 12, 0, 0).getTime(), size: 7 },
                },
            },
        },
    });
});

test("the Script Reader state keeps its file name and keys, and reads them back", () => {
    const path = "C:\\PinballY\\Scripts\\ExpansionPack\\script_reader.json";
    const fake = createFakePinballYHost({ now: NOW });
    fake.addProgram("C:\\PinballY\\Scripts\\ExpansionPack\\tools\\vpxtool.exe", () => ({ output: "" }));

    createScriptReaderState(fake).rememberVersion("0.37.1");
    assert.deepEqual(JSON.parse(fake.readFile(path)), { vpxtoolVersion: "0.37.1", version: 1 });
    assert.deepEqual(createScriptReaderState(fake).offer({ version: "0.38.0" }), { kind: "update", installed: "0.37.1" });
});

test("the Table ROM record keeps the source of a ROM a .nv confirmed", () => {
    const vpx = "C:\\Visual Pinball\\Tables\\Attack from Mars (Bally 1995).vpx";
    const nvram = "C:\\Visual Pinball\\VPinMAME\\nvram";
    const fake = createFakePinballYHost({
        now: NOW,
        tables: [{ configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", gameFile: vpx, isHidden: false }],
    });
    fake.addFile(vpx, "table");
    fake.addFolder(nvram);
    fake.setRegistryValue("HKCU\\Software\\Freeware\\Visual PinMame\\globals\\nvram_directory", nvram);
    createNvConfirmation(fake, createTableRomRecord(fake, createProfileStore(fake)));

    const [game] = fake.getAllTables();
    fake.fire("prelaunch", { game });
    fake.addFile(`${nvram}\\afm_113b.nv`, "nvram");
    fake.fire("postlaunch", { game });

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\table_roms.json`)), {
        version: 1,
        tables: { "Attack from Mars (Bally 1995)": { written: { rom: "afm_113b", source: "nv" } } },
    });
});

test("the High Score store keeps its file name and keys", () => {
    const configId = "Medieval Madness (Williams 1997)";
    const fake = createFakePinballYHost({ now: NOW, tables: [{ configId, title: "Medieval Madness", isHidden: false }] });
    fake.addFile(`${PROFILES_FOLDER}\\Bob\\profile.json`, JSON.stringify({ version: 1 }));
    const highScores = createHighScoreStore(fake, createProfileStore(fake));

    highScores.recordBoard(configId, [{ rank: 1, initials: "SLL", score: 52000000 }]);
    highScores.settlePlay(configId, [{ rank: 1, initials: "BOB", score: 60000000 }, { rank: 2, initials: "SLL", score: 52000000 }],
        { profileName: "Bob", start: new Date(2026, 8, 23, 9, 0, 0) });
    highScores.settlePlay(configId, [{ rank: 1, initials: "", score: 70000000 }, { rank: 2, initials: "BOB", score: 60000000 }],
        { profileName: "guest", start: new Date(2026, 8, 23, 9, 30, 0) });

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\high_scores.json`)), {
        version: 1,
        tables: {
            [configId]: {
                board: [
                    { rank: 1, initials: "", score: 70000000, owner: "guest" },
                    { rank: 2, initials: "BOB", score: 60000000, owner: "Bob" },
                ],
            },
        },
        highScores: [
            { profile: "Bob", configId, score: 60000000, initials: "BOB", place: 1, date: "2026-09-23T09:00:00", tableRecord: true, takenFrom: null },
            { profile: "guest", configId, score: 70000000, initials: "", place: 1, date: "2026-09-23T09:30:00", tableRecord: true, takenFrom: "Bob" },
        ],
    });
});

test("the High Score store keeps the key of each Profile's Achievements reset date", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [] });
    fake.addFile(`${PROFILES_FOLDER}\\Bob\\profile.json`, JSON.stringify({ version: 1 }));
    const profileStore = createProfileStore(fake);
    createHighScoreStore(fake, profileStore);

    profileStore.resetProfile("Bob");

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\high_scores.json`)).achievementsFrom, { bob: "2026-09-23T10:00:00" });
});

test("the High Score store keeps the key of the sources learned for tables without a ROM", () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [] });
    createHighScoreStore(fake, createProfileStore(fake)).learnSource("Zelda (Original 2023)", { kind: "vpreg", section: "ZELDA" });

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\high_scores.json`)).learnedSources, {
        "Zelda (Original 2023)": { kind: "vpreg", section: "ZELDA" },
    });
});

test("the High Scores Achievement IDs stay byte-identical", () => {
    assert.deepEqual(buildHighScoreAchievements({}).map(achievement => achievement.id), [
        "highScoreTables:1",
        "highScoreTables:3",
        "highScoreTables:5",
        "highScoreTables:10",
        "tableRecordTables:1",
        "tableRecordTables:3",
        "tableRecordTaken",
    ]);
});

test(".env.local keeps the OFFER_VPXTOOL key", () => {
    assert.equal(DEFAULTS.offerVpxtool, true);
    assert.equal(applyEnvOverrides(DEFAULTS, "OFFER_VPXTOOL=false\n").config.offerVpxtool, false);
});

test(".env.local keeps the ADD_ON_STATUS_ICONS key", () => {
    assert.equal(DEFAULTS.addOns.statusIcons, true);
    assert.equal(applyEnvOverrides(DEFAULTS, "ADD_ON_STATUS_ICONS=false\n").config.addOns.statusIcons, false);
});

test(".env.local keeps the ADD_ON_DISCORD_RICH_PRESENCE and DISCORD_APPLICATION_ID keys", () => {
    assert.equal(DEFAULTS.addOns.discordRichPresence, false);
    assert.equal(applyEnvOverrides(DEFAULTS, "ADD_ON_DISCORD_RICH_PRESENCE=true\n").config.addOns.discordRichPresence, true);
    assert.equal(DEFAULTS.discordApplicationId, "");
    assert.equal(applyEnvOverrides(DEFAULTS, "DISCORD_APPLICATION_ID=123\n").config.discordApplicationId, "123");
});
