// ============================================================
// Challenge targets calibrated on the Play Log: Play Logs seeded on the
// fake host, fixed dates and a scripted random source, the drawn target
// read from cabinet.json.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createPeriodTable, TABLE_OF_THE_DAY, TABLE_OF_THE_WEEK, shiftDateKey } from "../../common/tables/period_table.js";
import { createRandomGame } from "../../common/tables/random_game.js";
import { createChallenges } from "../../common/challenges/challenge.js";
import { createAchievementToasts } from "../../common/achievements/achievement_toast.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Monday 21 September 2026; its last complete week starts on 14 September.
const MONDAY = new Date(2026, 8, 21, 20, 0, 0);
// 3 days left in the week, today included.
const FRIDAY = new Date(2026, 8, 25, 20, 0, 0);
const WEEK = "2026-09-21";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET_FILE = `${PROFILES}\\cabinet.json`;
const playLogFile = (name, year) => `${PROFILES}\\${name}\\play-log-${year}.json`;

const table = (id, manufacturer, year) =>
    ({ id, configId: `Table ${id}`, title: `Table ${id}`, manufacturer, year, isHidden: false });
// Stern has 3 tables, Williams 5, the 1990s 5: every template but
// dustyTables is feasible.
const TABLES = [
    table(1, "Stern", 2016), table(2, "Stern", 2018), table(3, "Stern", 2020),
    table(4, "Williams", 1992), table(5, "Williams", 1993), table(6, "Williams", 1994),
    table(7, "Bally", 1980), table(8, "Gottlieb", 1978), table(9, "Williams", 1995), table(10, "Williams", 1996),
];
// Tables 90 and up are gone from the collection.
const GONE = [90, 91, 92, 93];
const DRAWABLE = ["differentTables", "manufacturerTables", "decadeTables", "differentManufacturers", "differentDecades",
    "neverPlayedTables", "tableOfTheDayDays", "tableOfTheWeekGames", "activeDays", "endurance", "marathon",
    "randomGames", "sameTableGames"];

// A random source that returns these values in turn, then 0.
const scripted = values => () => (values.length > 0 ? values.shift() : 0);
// The randoms that draw this template, then this option among options,
// then the target (used only by a fixed range).
const drawing = (template, { option = 0, options = 1, target = 0, drawable = DRAWABLE } = {}) =>
    [(drawable.indexOf(template) + 0.5) / drawable.length, (option + 0.5) / options, target];

// A day of the complete week weeksBack weeks before this one, Monday + day.
const dayOf = (weeksBack, day = 0, week = WEEK) => shiftDateKey(week, -7 * weeksBack + day);
// One Play on that day, on Table id, minutes long.
const logged = (day, id, minutes = 2) => ({ start: `${day}T20:00:00`, configId: `Table ${id}`, seconds: minutes * 60 });
// A Play on each table, on the week's Monday.
const weekOfTables = (weeksBack, ids, week) => ids.map(id => logged(dayOf(weeksBack, 0, week), id));
// A first Play long ago, so that the Household's Play Log covers 8 weeks.
const longAgo = (week = WEEK) => [logged(dayOf(10, 0, week), 1)];

// logs: each Profile's Plays, Guest's under "guest", written by year;
// plays: each Profile's play records in its profile.json.
function setUp({ now = MONDAY, tables = TABLES, profiles = ["Alice"], logs = {}, plays = {}, randoms = [] }) {
    const fake = createFakePinballYHost({ now, tables });
    fake.installGlobals();
    const names = [...profiles, ...(logs.guest ? ["guest"] : [])];
    for (const name of names) {
        fake.addFolder(`${PROFILES}\\${name}`);
        if (plays[name]) fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ plays: plays[name] }));
        const byYear = new Map();
        for (const play of logs[name] || []) {
            const year = Number(play.start.slice(0, 4));
            byYear.set(year, [...(byYear.get(year) || []), play]);
        }
        for (const [year, plays] of byYear) fake.addFile(playLogFile(name, year), JSON.stringify({ version: 1, plays }));
    }
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: names[0] }));
    const store = createProfileStore(fake);
    const challenges = createChallenges(fake, store, {
        tableOfTheDay: createPeriodTable(fake, TABLE_OF_THE_DAY, store),
        tableOfTheWeek: createPeriodTable(fake, TABLE_OF_THE_WEEK, store),
        randomGame: createRandomGame(fake, store, { animateTo: async () => {}, skipAnimation: true }),
        toasts: createAchievementToasts(fake),
        random: scripted([...randoms]),
    });
    challenges.getCurrent();
    return fake;
}

// The drawn Challenge, checked to be the template asked for.
function drawn(template, { draw, ...options }) {
    const fake = setUp({ ...options, randoms: drawing(template, draw) });
    const { current } = JSON.parse(fake.readFile(CABINET_FILE)).challenge;
    assert.equal(current.template, template);
    assertNoErrorLogged(fake);
    return current;
}
const targetOf = (template, options) => drawn(template, options).target;

test("a calibrated target is the second best of the last 8 complete weeks plus 1", () => {
    // Distinct tables by week: 2, 5, 3, 6 (the best, 8 weeks back), then nothing.
    const alice = [
        ...weekOfTables(1, [1, 2]), ...weekOfTables(3, [1, 2, 3, 4, 5]), ...weekOfTables(5, [1, 2, 3]),
        ...weekOfTables(8, [1, 2, 3, 4, 5, 6]), ...longAgo(),
    ];
    assert.equal(targetOf("differentTables", { logs: { Alice: alice } }), 6);
});

test("a week before the last 8 complete ones, or this week's, doesn't count", () => {
    const alice = [
        ...weekOfTables(9, [1, 2, 3, 4, 5, 6, 7]), ...weekOfTables(0, [1, 2, 3, 4, 5, 6, 7]),
        ...weekOfTables(2, [1, 2, 3, 4]), ...weekOfTables(4, [1, 2, 3, 4]), ...longAgo(),
    ];
    assert.equal(targetOf("differentTables", { logs: { Alice: alice } }), 5);
});

test("a calibrated target may exceed the range's maximum", () => {
    // Marathon minutes by week: 200 and 150, against a range of 60 to 120.
    const alice = [logged(dayOf(1), 1, 200), logged(dayOf(2, 3), 2, 100), logged(dayOf(2, 4), 3, 50), ...longAgo()];
    assert.equal(targetOf("marathon", { logs: { Alice: alice } }), 151);
});

test("a calibrated target is never below the range's minimum", () => {
    const alice = [...weekOfTables(1, [1]), ...weekOfTables(2, [1, 2]), ...longAgo()];
    assert.equal(targetOf("differentTables", { logs: { Alice: alice } }), 4);
});

test("a calibrated target is capped by what the collection allows, and by the days left", () => {
    // 14 distinct tables two weeks running, gone ones included: 10 visible tables.
    const fourteen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...GONE];
    const alice = [...weekOfTables(1, fourteen), ...weekOfTables(2, fourteen), ...longAgo()];
    assert.equal(targetOf("differentTables", { logs: { Alice: alice } }), 10);

    // 5 active days two weeks running, on a Friday: 3 days left.
    const fiveDays = weeksBack => [0, 1, 2, 3, 4].map(day => logged(dayOf(weeksBack, day), 1));
    const bob = [...fiveDays(1), ...fiveDays(2), ...longAgo()];
    assert.equal(targetOf("activeDays", { now: FRIDAY, profiles: ["Bob"], logs: { Bob: bob } }), 3);
});

test("a manufacturer's or decade's tables count with the drawn parameter", () => {
    // Williams tables by week: 4 and 3 (Stern's 1 and 2, every table's 5
    // and 5); the option drawn is Williams, the second of Stern and Williams.
    const alice = [...weekOfTables(1, [1, 4, 5, 6, 9]), ...weekOfTables(2, [1, 2, 4, 5, 9]), ...longAgo()];
    assert.deepEqual(drawn("manufacturerTables", { logs: { Alice: alice }, draw: { option: 1, options: 2 } }),
        { week: WEEK, template: "manufacturerTables", param: "Williams", target: 4 });
    // The 1990s tables by week: 4, 1 and 3 (every table's 4, 2 and 4).
    const bob = [...weekOfTables(1, [4, 5, 6, 9]), ...weekOfTables(2, [4, 7]), ...weekOfTables(3, [5, 6, 10, 8]), ...longAgo()];
    assert.deepEqual(drawn("decadeTables", { profiles: ["Bob"], logs: { Bob: bob } }),
        { week: WEEK, template: "decadeTables", param: 1990, target: 4 });
});

test("a Play on a table gone from the collection counts only for the templates that need only its table", () => {
    // Each week: Stern, Williams and Bally, and two gone tables.
    const weeks = [...weekOfTables(1, [1, 4, 7, 90, 91]), ...weekOfTables(2, [1, 4, 7, 92, 93]), ...longAgo()];
    assert.equal(targetOf("differentTables", { logs: { Alice: weeks } }), 6);
    assert.equal(targetOf("differentManufacturers", { logs: { Alice: weeks } }), 4);
    // Games on the best table by week: 5 and 4, both on a gone table.
    const sameGone = [...weeks, ...weekOfTables(1, [90, 90, 90, 90]), ...weekOfTables(2, [92, 92, 92])];
    assert.equal(targetOf("sameTableGames", { logs: { Alice: sameGone } }), 5);
});

test("a Play on a table now hidden counts nowhere, as in a Challenge", () => {
    // Table 10 hidden: Williams and the 1990s keep 4 tables, the same templates.
    const tables = TABLES.map(game => (game.id === 10 ? { ...game, isHidden: true } : game));
    const alice = [...weekOfTables(1, [1, 2, 3, 4, 10]), ...weekOfTables(2, [1, 2, 3, 4, 10]), ...longAgo()];
    assert.equal(targetOf("differentTables", { tables, logs: { Alice: alice } }), 5);
});

test("the target is the median of the bar-setting Profiles that played in the window", () => {
    const tables = n => [1, 2, 3, 4, 5, 6, 7, 8].slice(0, n);
    const twoWeeks = n => [...weekOfTables(1, tables(n)), ...weekOfTables(2, tables(n))];
    // Alice 4, Bob 7, Carol 9; Dave played only before the window.
    const logs = { Alice: [...twoWeeks(3), ...longAgo()], Bob: twoWeeks(6), Carol: twoWeeks(8), Dave: longAgo() };
    assert.equal(targetOf("differentTables", { profiles: ["Alice", "Bob", "Carol", "Dave"], logs }), 7);

    // Two values, 5 and 8: the higher half of the way, rounded up.
    const two = { Alice: [...twoWeeks(4), ...longAgo()], Carol: twoWeeks(7) };
    assert.equal(targetOf("differentTables", { profiles: ["Alice", "Carol"], logs: two }), 7);
});

test("Guest's Plays never count in the calibration", () => {
    const alice = [...weekOfTables(1, [1, 2, 3, 4]), ...weekOfTables(2, [1, 2, 3, 4]), ...longAgo()];
    const guest = [...weekOfTables(1, [1, 2, 3, 4, 5, 6, 7]), ...weekOfTables(2, [1, 2, 3, 4, 5, 6, 7])];
    assert.equal(targetOf("differentTables", { logs: { Alice: alice, guest } }), 5);

    // Guest alone: nothing to calibrate on, the fixed range's highest target.
    assert.equal(targetOf("differentTables", { profiles: [], logs: { guest: [...guest, ...longAgo()] }, draw: { target: 0.99 } }), 8);
});

test("with the picker off Guest sets the bar, yet its Plays still don't count", () => {
    const saved = config.addOns.profilePicker;
    config.addOns.profilePicker = false;
    try {
        const guest = [...weekOfTables(1, [1, 2, 3, 4, 5, 6]), ...weekOfTables(2, [1, 2, 3, 4, 5, 6]), ...longAgo()];
        assert.equal(targetOf("differentTables", { logs: { Alice: longAgo(), guest }, draw: { target: 0 } }), 4);
    } finally {
        config.addOns.profilePicker = saved;
    }
});

test("under 4 complete weeks of Play Log in the Household, targets come from the fixed ranges", () => {
    const bigWeeks = weeksBack => [...Array(weeksBack).keys()].map(index => logged(dayOf(index + 1), 1, 300));
    // First Play 3 weeks back: the fixed range, its highest target.
    assert.equal(targetOf("marathon", { logs: { Alice: bigWeeks(3) }, draw: { target: 0.99 } }), 120);
    // First Play 4 weeks back: calibrated.
    assert.equal(targetOf("marathon", { logs: { Alice: bigWeeks(4) }, draw: { target: 0.99 } }), 301);
    // ... by any Profile.
    const bob = [logged(dayOf(4), 2, 1)];
    assert.equal(targetOf("marathon", { profiles: ["Alice", "Bob"], logs: { Alice: bigWeeks(3), Bob: bob },
        draw: { target: 0.99 } }), 151);
    // Guest's first Play doesn't make the Play Log old enough.
    assert.equal(targetOf("marathon", { logs: { Alice: bigWeeks(3), guest: longAgo() }, draw: { target: 0.99 } }), 120);
});

test("the templates the Play Log cannot recompute keep their fixed ranges", () => {
    const busy = [];
    for (let weeksBack = 1; weeksBack <= 8; weeksBack++) {
        for (const day of [0, 1, 2, 3, 4, 5, 6]) busy.push(...[1, 2, 3, 4, 5, 6, 7, 8].map(id => logged(dayOf(weeksBack, day), id, 30)));
    }
    const logs = { Alice: [...busy, ...longAgo()] };
    const ranges = [["neverPlayedTables", 3, 5], ["tableOfTheDayDays", 3, 5], ["tableOfTheWeekGames", 4, 8], ["randomGames", 3, 6]];
    for (const [template, lowest, highest] of ranges) {
        assert.equal(targetOf(template, { logs, draw: { target: 0.99 } }), highest, template);
        assert.equal(targetOf(template, { logs, draw: { target: 0 } }), lowest, template);
    }

    // Tables 1 to 5 last played in January 2025: dusty for Alice.
    const dusty = Object.fromEntries([1, 2, 3, 4, 5].map(id => [`Table ${id}`, { count: 1, lastPlayed: "2025-01-01T20:00:00" }]));
    const drawable = [...DRAWABLE.slice(0, 6), "dustyTables", ...DRAWABLE.slice(6)];
    const withDusty = { logs, plays: { Alice: dusty } };
    assert.equal(targetOf("dustyTables", { ...withDusty, draw: { target: 0.99, drawable } }), 5);
    assert.equal(targetOf("dustyTables", { ...withDusty, draw: { target: 0, drawable } }), 3);
});

test("the last 8 complete weeks reach across New Year, over two Play Log files", () => {
    // Monday 11 January 2027: its last complete week starts on 4 January.
    const week = "2027-01-11";
    const alice = [...weekOfTables(1, [1, 2, 3, 4, 5], week), ...weekOfTables(3, [1, 2, 3, 4, 5, 6], week), ...longAgo(week)];
    assert.equal(alice.filter(play => play.start.startsWith("2026")).length, 7);
    assert.equal(targetOf("differentTables", { now: new Date(2027, 0, 11, 20, 0, 0), logs: { Alice: alice } }), 6);
});
