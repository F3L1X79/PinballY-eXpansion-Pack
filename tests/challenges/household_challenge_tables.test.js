// ============================================================
// Household Challenge Tables over the fake host with real modules: the
// filter sits under the Challenge Tables and puts on the wheel the active
// Profile's tables that move the Household Challenge forward.
// - Never played and dusty follow the active Profile; a switch runs it again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createPeriodTable, TABLE_OF_THE_DAY, TABLE_OF_THE_WEEK } from "../../common/tables/period_table.js";
import { createRandomGame } from "../../common/tables/random_game.js";
import { createHouseholdChallenge } from "../../common/challenges/household_challenge.js";
import { createHouseholdChallengeTables } from "../../common/challenges/challenge_tables.js";
import { createAchievementToasts } from "../../common/achievements/achievement_toast.js";
import { createMainMenu } from "../../common/menus/main_menu.js";
import { createWheelOrder } from "../../common/tables/wheel_order.js";
import { filterPickerSection } from "../support/main_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import lang from "../../common/core/i18n.js";

// Monday 21 September 2026, 20:00; its week is keyed "2026-09-21".
const MONDAY = new Date(2026, 8, 21, 20, 0, 0);
const WEEK = "2026-09-21";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const FILTER_ID = "User.project.HouseholdChallengeTables";
const TITLE = lang.customMenuLabels.householdChallengeTables;

const table = (id, manufacturer, year, isHidden = false) =>
    ({ id, configId: `Table ${id}`, title: `Table ${id}`, manufacturer, year, isHidden });
// Tables 1 to 6, the 4th hidden.
const TABLES = [
    table(1, "Stern", 2016), table(2, "Stern", 2020), table(3, "Williams", 1992),
    table(4, "Stern", 2021, true), table(5, "Stern", 1995), table(6, "Bally", 1993),
];
const played = lastPlayed => ({ count: 1, seconds: 600, lastPlayed });
const RECENTLY = played("2026-09-13T20:00:00");
// More than six months before MONDAY.
const LONG_AGO = played("2026-03-21T20:00:00");

const lockOf = (template, param = null, target = 3) => ({ week: WEEK, template, param, target, games: [] });

// saved: the week's Household Challenge, already locked in cabinet.json;
// plays: each Profile's play records.
function setUp({ saved, active = "Alice", plays = {} } = {}) {
    const fake = createFakePinballYHost({ now: MONDAY, tables: TABLES });
    fake.installGlobals();
    for (const name of ["Alice", "Bob"]) {
        fake.addFolder(`${PROFILES}\\${name}`);
        if (plays[name]) fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ plays: plays[name] }));
    }
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({
        version: 1, activeProfile: active, householdChallenge: saved && { current: saved, previous: null },
    }));
    const store = createProfileStore(fake);
    const tableOfTheDay = createPeriodTable(fake, TABLE_OF_THE_DAY, store);
    const tableOfTheWeek = createPeriodTable(fake, TABLE_OF_THE_WEEK, store);
    const randomGame = createRandomGame(fake, store, { animateTo: async () => {}, skipAnimation: true });
    const household = createHouseholdChallenge(fake, store,
        { challenges: null, tableOfTheDay, tableOfTheWeek, randomGame, toasts: createAchievementToasts(fake) });
    // Several fakes in one process: no shared Wheel Order, this fake's own.
    createHouseholdChallengeTables(fake, household, store, createMainMenu(fake), {
        wheelOrder: createWheelOrder(fake, store, { isEnabled: true }),
    });
    return { fake, store, tableOfTheDay, tableOfTheWeek };
}

// Chooses the filter, then the menu closes; the wheel's tables.
function chooseFilter(fake) {
    fake.setCurrentFilter(FILTER_ID);
    fake.fire("wheelmode");
    return fake.getWheelTables().map(game => game.configId);
}
const wheelTables = fake => fake.getWheelTables().map(game => game.configId);
// Nothing to play: choosing the filter brings every table back.
const offersNothing = fake => {
    chooseFilter(fake);
    return fake.currentFilterId() === "All";
};
// The Filter Picker's wheel selections, or null without the entry.
const householdSection = fake => filterPickerSection(fake, TITLE);

function play(fake, game, seconds = 90) {
    fake.gameStarted(game);
    fake.advanceTime(seconds * 1000);
    fake.gameOver(game);
}

test("manufacturerTables: the manufacturer's visible tables, leaving out those any Profile already counted", () => {
    const { fake, store } = setUp({ saved: lockOf("manufacturerTables", "Stern") });

    assert.deepEqual(chooseFilter(fake), ["Table 1", "Table 2", "Table 5"]);

    play(fake, TABLES[1]);
    store.switchTo("Bob");
    play(fake, TABLES[0]);
    assert.deepEqual(chooseFilter(fake), ["Table 5"], "Alice's and Bob's Plays both counted");
    assertNoErrorLogged(fake);
});

test("decadeTables: the decade's visible tables, leaving out those already counted", () => {
    const { fake } = setUp({ saved: lockOf("decadeTables", 1990) });

    assert.deepEqual(chooseFilter(fake), ["Table 3", "Table 5", "Table 6"]);

    play(fake, TABLES[4]);
    assert.deepEqual(chooseFilter(fake), ["Table 3", "Table 6"]);
});

test("neverPlayedTables: the tables the active Profile never played, run again at once on a switch", () => {
    const { fake, store } = setUp({
        saved: lockOf("neverPlayedTables"),
        plays: { Alice: { "Table 1": RECENTLY, "Table 3": LONG_AGO }, Bob: { "Table 2": RECENTLY } },
    });

    assert.deepEqual(chooseFilter(fake), ["Table 2", "Table 5", "Table 6"]);

    store.switchTo("Bob");
    assert.deepEqual(wheelTables(fake), ["Table 1", "Table 3", "Table 5", "Table 6"], "Bob's own, before any return to the wheel");
});

test("dustyTables: the tables the active Profile last played more than six months ago", () => {
    const { fake, store } = setUp({
        saved: lockOf("dustyTables"),
        plays: { Alice: { "Table 1": RECENTLY, "Table 2": LONG_AGO, "Table 3": LONG_AGO }, Bob: { "Table 6": LONG_AGO } },
    });

    assert.deepEqual(chooseFilter(fake), ["Table 2", "Table 3"]);

    store.switchTo("Bob");
    assert.deepEqual(wheelTables(fake), ["Table 6"]);
});

test("never played and dusty: a table another Profile already counted is left out", () => {
    for (const [template, alicePlay] of [["neverPlayedTables", undefined], ["dustyTables", LONG_AGO]]) {
        const { fake, store } = setUp({
            saved: lockOf(template),
            plays: { Alice: alicePlay ? { "Table 5": alicePlay, "Table 6": alicePlay } : {}, Bob: { "Table 5": LONG_AGO } },
        });
        store.switchTo("Bob");
        // Never played for Bob, or dusty for him: counted either way.
        play(fake, template === "neverPlayedTables" ? TABLES[5] : TABLES[4]);
        store.switchTo("Alice");

        const counted = template === "neverPlayedTables" ? "Table 6" : "Table 5";
        assert.ok(!chooseFilter(fake).includes(counted), template);
        assertNoErrorLogged(fake);
    }
});

test("tableOfTheDayDays: the Table of the Day, until any Profile counted it today", () => {
    const { fake, store, tableOfTheDay } = setUp({ saved: lockOf("tableOfTheDayDays") });
    const mondayTable = tableOfTheDay.getTable();

    assert.deepEqual(chooseFilter(fake), [mondayTable.configId]);

    store.switchTo("Bob");
    play(fake, mondayTable);
    store.switchTo("Alice");
    assert.ok(offersNothing(fake), "today already counted by Bob");
});

test("tableOfTheWeekGames: the Table of the Week, even once played", () => {
    const { fake, tableOfTheWeek } = setUp({ saved: lockOf("tableOfTheWeekGames") });
    const weekTable = tableOfTheWeek.getTable();

    assert.deepEqual(chooseFilter(fake), [weekTable.configId]);
    play(fake, weekTable);
    assert.deepEqual(chooseFilter(fake), [weekTable.configId]);
});

test("the other templates offer no table, and the entry is absent", () => {
    for (const template of ["differentTables", "differentManufacturers", "differentDecades", "activeDays",
        "endurance", "marathon", "randomGames", "sameTableGames"]) {
        const { fake } = setUp({ saved: lockOf(template) });
        assert.equal(householdSection(fake), null, template);
        assert.ok(offersNothing(fake), template);
    }
});

test("a week without a Household Challenge offers no table, and the entry is absent", () => {
    const { fake } = setUp({ saved: { week: WEEK, template: "", param: null, target: 0, games: [] } });

    assert.equal(householdSection(fake), null);
    assert.ok(offersNothing(fake));
});

test("once the Household Challenge is completed, the wheel goes back to every table and the entry is gone", () => {
    const { fake, store } = setUp({ saved: lockOf("manufacturerTables", "Stern", 2) });
    chooseFilter(fake);
    play(fake, TABLES[0]);
    assert.notEqual(householdSection(fake), null);

    store.switchTo("Bob");
    play(fake, TABLES[1]);

    assert.equal(fake.currentFilterId(), "All");
    assert.equal(householdSection(fake), null);
});

// PinballY's "All Tables" has sort key "3000", the Hall of Fame "6000" in
// the [Top] group; the Challenge Tables "5000".
test("the entry sits in the Filter Picker under All Tables, after where the Challenge Tables go", () => {
    const { fake } = setUp({ saved: lockOf("manufacturerTables", "Stern") });

    const [filter] = fake.scriptFilters();
    assert.equal(filter.group, "[Top]");
    assert.ok(filter.sortKey > "5000" && filter.sortKey < "6000", filter.sortKey);
    assert.deepEqual(householdSection(fake), ["All Tables", TITLE, "Favorites"]);
});
