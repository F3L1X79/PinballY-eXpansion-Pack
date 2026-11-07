// ============================================================
// The tables a Child Profile sees off the wheel, through main.js: no Adult
// Table in its Challenge Tables, Most Played, Tables to Discover, Collection
// or completion Achievements; a game on one never moves its Challenge.
// Switching to an adult Profile brings them back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { pressAndGlide, readRows, untilListShown } from "../achievements/achievement_list_reader.js";
import { openProfileStats, buttons, choose, press, section } from "../stats/profile_stats_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// A Thursday: the week started on Monday 2026-09-28.
const NOW = new Date(2026, 9, 1, 20, 0, 0);
const WEEK = "2026-09-28";
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

const table = (id, title, manufacturer, year, categories) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories,
    isConfigured: true, isHidden: false,
});
const PLAYBOY = table(1, "Playboy", "Bally", 1978, ["NSFW", "Classic"]);
const CLOSE_ENCOUNTERS = table(2, "Close Encounters", "Gottlieb", 1978, ["SciFi"]);
const MEDIEVAL = table(3, "Medieval Madness", "Williams", 1997, ["Fantasy", "Classic"]);
const MARS = table(4, "Attack from Mars", "Bally", 1995, ["SciFi", "Classic"]);
// The only table of its manufacturer and of its decade.
const PARTY_NIGHT = table(5, "Party Night", "VPX Community", 2023, ["NSFW"]);
const TABLES = [PLAYBOY, CLOSE_ENCOUNTERS, MEDIEVAL, MARS, PARTY_NIGHT];

const followingTheWeek = games => ({
    firstWeek: WEEK, week: WEEK, games, completed: false, completedCount: 0, judgedWeek: "", history: [],
});
const factsOf = (game, seconds) => ({
    configId: game.configId, manufacturer: game.manufacturer, decade: 1970, day: "2026-09-29", seconds,
    randomGame: false, isTableOfTheDay: false, isTableOfTheWeek: false, wasNeverPlayed: true, wasDusty: false,
});
// Alice played Playboy before she was marked, and Close Encounters this week.
const ALICE = {
    version: 1,
    isChild: true,
    plays: {
        [PLAYBOY.configId]: { count: 2, seconds: 1200, lastPlayed: "2026-09-20T20:00:00" },
        [CLOSE_ENCOUNTERS.configId]: { count: 1, seconds: 600, lastPlayed: "2026-09-29T20:00:00" },
    },
    notified: [],
    challenge: followingTheWeek([factsOf(CLOSE_ENCOUNTERS, 600)]),
};
const BOB = { version: 1, plays: {}, notified: [], challenge: followingTheWeek([]) };

const challengeGamesOf = (fake, name) => JSON.parse(fake.readFile(profileFile(name))).challenge.games;

test("a Child Profile's Challenge, Profile Stats and Achievements leave out the Adult Tables", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(profileFile("Alice"), JSON.stringify(ALICE));
    fake.addFile(profileFile("Bob"), JSON.stringify(BOB));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({
        version: 1,
        activeProfile: "Alice",
        challenge: { current: { week: WEEK, template: "decadeTables", param: 1970, target: 2 }, previous: null },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    const addOnsUnderTest = ["challenges", "profilePicker", "customMenuCommands", "achievements", "hallOfFame", "tablesToDiscover"];
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOnsUnderTest.includes(key);
    config.language = "en";
    // No startup carousel holding the buttons from the first tick.
    config.startupScreen = "wheel";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    const store = getProfileStore();
    const STATS = lang.profileStats;
    const ACHIEVEMENTS = lang.achievements;

    const openMainMenu = () => fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
    // The wheel's tables after the Profile Stats button with this label;
    // none when the button is not shown.
    function selectionOf(label) {
        openProfileStats(fake, lang);
        if (!buttons(fake).some(button => button.label === label)) {
            press(fake, "Exit");
            return [];
        }
        choose(fake, label);
        const titles = fake.getWheelTables().map(game => game.title);
        globalThis.gameList.setCurFilter("All");
        return titles;
    }
    // The Collection stat: its value and percentage pill.
    function collectionShown() {
        openProfileStats(fake, lang);
        const progression = section(fake, STATS.sections.progression, STATS.stats);
        press(fake, "Exit");
        return progression[STATS.stats.collection];
    }
    function readAchievementRows() {
        openMainMenu();
        fake.selectMenuItem(lang.achievementList.menuEntry);
        untilListShown(fake);
        const rows = readRows(fake, lang.achievementList);
        pressAndGlide(fake, "Exit");
        return rows;
    }
    const titlesOf = rows => rows.map(row => row.title);
    const classicDescription = rows => rows.find(row => row.title === ACHIEVEMENTS.categoryCompletionTitle("Classic")).description;
    const ADULT_ONLY_GROUPS = [
        ACHIEVEMENTS.categoryCompletionTitle("NSFW"),
        ACHIEVEMENTS.manufacturerCompletionTitle("VPX Community"),
        ACHIEVEMENTS.decadeCompletionTitle(2020),
    ];

    // The child's only 1970s table left is an Adult Table: no Challenge
    // Tables, so every table comes back on the next return to the wheel.
    fake.selectFilter("User.project.ChallengeTables");
    fake.fire("wheelmode");
    assert.equal(fake.currentFilterId(), "All", "no Adult Table among the Challenge Tables");

    assert.deepEqual(selectionOf(STATS.buttons.mostPlayedTables), ["Close Encounters"], "Most Played Tables");
    assert.deepEqual(selectionOf(STATS.buttons.tablesToDiscover), ["Attack from Mars", "Medieval Madness"], "Tables to Discover");
    assert.deepEqual(collectionShown(), ["1/3", "33%"], "Collection without the Adult Tables");

    const childRows = readAchievementRows();
    assert.deepEqual(ADULT_ONLY_GROUPS.filter(title => titlesOf(childRows).includes(title)), [],
        "no completion Achievement for a group made only of Adult Tables");
    assert.equal(classicDescription(childRows), ACHIEVEMENTS.categoryCompletionDescription("Classic", 2));

    // A game on an Adult Table, however it was launched, never counts for the child.
    fake.gameStarted(PLAYBOY);
    fake.advanceTime(5 * 60 * 1000);
    fake.gameOver(PLAYBOY);
    await settle();
    assert.equal(challengeGamesOf(fake, "Alice").length, 1, "the Challenge progress leaves out the Adult Tables");

    store.switchTo("Bob");
    await settle();
    const adultRows = readAchievementRows();
    assert.deepEqual(ADULT_ONLY_GROUPS.filter(title => titlesOf(adultRows).includes(title)), ADULT_ONLY_GROUPS,
        "an adult Profile gets every group back");
    assert.equal(classicDescription(adultRows), ACHIEVEMENTS.categoryCompletionDescription("Classic", 3));
    assert.deepEqual(selectionOf(STATS.buttons.mostPlayedTables), [], "nothing played by Bob");
    assert.equal(selectionOf(STATS.buttons.tablesToDiscover).length, 5, "every table for an adult Profile");
    assert.deepEqual(collectionShown(), ["0/5", "0%"]);

    fake.selectFilter("User.project.ChallengeTables");
    assert.deepEqual(fake.getWheelTables().map(game => game.title).sort(), ["Close Encounters", "Playboy"]);
    fake.gameStarted(PLAYBOY);
    fake.advanceTime(5 * 60 * 1000);
    fake.gameOver(PLAYBOY);
    await settle();
    assert.equal(challengeGamesOf(fake, "Bob").length, 1, "an Adult Table counts for an adult Profile");

    assertNoErrorLogged(fake);
});
