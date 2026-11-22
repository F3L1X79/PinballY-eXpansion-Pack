// ============================================================
// Shared setup of the calibration scenarios: a collection, Play Logs
// seeded on the fake host by Profile and year, fixed dates and the
// scripted randoms that draw a given template, for the Challenge and the
// Household Challenge alike.
// ============================================================

import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createPeriodTable, TABLE_OF_THE_DAY, TABLE_OF_THE_WEEK, shiftDateKey } from "../../common/tables/period_table.js";
import { createRandomGame } from "../../common/tables/random_game.js";

// Monday 21 September 2026; its last complete week starts on 14 September.
export const MONDAY = new Date(2026, 8, 21, 20, 0, 0);
// 3 days left in the week, today included.
export const FRIDAY = new Date(2026, 8, 25, 20, 0, 0);
export const WEEK = "2026-09-21";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
export const CABINET_FILE = `${PROFILES}\\cabinet.json`;
const playLogFile = (name, year) => `${PROFILES}\\${name}\\play-log-${year}.json`;

const table = (id, manufacturer, year) =>
    ({ id, configId: `Table ${id}`, title: `Table ${id}`, manufacturer, year, isHidden: false });
// Stern has 3 tables, Williams 5, the 1990s 5: every template but
// dustyTables is feasible.
export const TABLES = [
    table(1, "Stern", 2016), table(2, "Stern", 2018), table(3, "Stern", 2020),
    table(4, "Williams", 1992), table(5, "Williams", 1993), table(6, "Williams", 1994),
    table(7, "Bally", 1980), table(8, "Gottlieb", 1978), table(9, "Williams", 1995), table(10, "Williams", 1996),
];
// Tables 90 and up are gone from the collection.
export const GONE = [90, 91, 92, 93];
export const DRAWABLE = ["differentTables", "manufacturerTables", "decadeTables", "differentManufacturers", "differentDecades",
    "neverPlayedTables", "tableOfTheDayDays", "tableOfTheWeekGames", "activeDays", "endurance", "marathon",
    "randomGames", "sameTableGames"];

// A random source that returns these values in turn, then 0.
export const scripted = values => () => (values.length > 0 ? values.shift() : 0);
// The randoms that draw this template, then this option among options,
// then the target (used only by a fixed range).
export const drawing = (template, { option = 0, options = 1, target = 0, drawable = DRAWABLE } = {}) =>
    [(drawable.indexOf(template) + 0.5) / drawable.length, (option + 0.5) / options, target];

// A day of the complete week weeksBack weeks before this one, Monday + day.
export const dayOf = (weeksBack, day = 0, week = WEEK) => shiftDateKey(week, -7 * weeksBack + day);
// One Play on that day, on Table id, minutes long.
export const logged = (day, id, minutes = 2) => ({ start: `${day}T20:00:00`, configId: `Table ${id}`, seconds: minutes * 60 });
// A Play on each table, on the week's Monday.
export const weekOfTables = (weeksBack, ids, week) => ids.map(id => logged(dayOf(weeksBack, 0, week), id));
// A first Play long ago, so that the Household's Play Log covers 8 weeks.
export const longAgo = (week = WEEK) => [logged(dayOf(10, 0, week), 1)];

// logs: each Profile's Plays, Guest's under "guest", written by year;
// plays: each Profile's play records in its profile.json. Returns the fake
// host, the Profile store and the modules a challenge draw needs.
export function setUpPlayLogs({ now = MONDAY, tables = TABLES, profiles = ["Alice"], logs = {}, plays = {} }) {
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
        for (const [year, yearPlays] of byYear) fake.addFile(playLogFile(name, year), JSON.stringify({ version: 1, plays: yearPlays }));
    }
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: names[0] }));
    const store = createProfileStore(fake);
    const modules = {
        tableOfTheDay: createPeriodTable(fake, TABLE_OF_THE_DAY, store),
        tableOfTheWeek: createPeriodTable(fake, TABLE_OF_THE_WEEK, store),
        randomGame: createRandomGame(fake, store, { animateTo: async () => {}, skipAnimation: true }),
    };
    return { fake, store, modules };
}
