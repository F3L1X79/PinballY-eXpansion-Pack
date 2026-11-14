// ============================================================
// The Wheel Order's page jumps on the pack's own filters through main.js:
// alphabetical, Original Tables pages by first letter and Most Played Tables
// one table at a time (its ranking); by year, Tables to Discover pages by
// decade, the tables without a year last. Each jump is in the Info Log.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "wheelOrder", "tablesToDiscover", "hallOfFame", "customFilter"];
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const PROFILES = `${PACK}\\profiles`;
const INFO_LOG = `${PACK}\\logs\\info.log`;
const TABLES_TO_DISCOVER = "User.project.TablesToDiscover";
const MOST_PLAYED = "User.project.HallOfFame";
const ORIGINAL_TABLES = "User.project.OriginalTables";

const table = (title, year, extra = {}) => ({ id: title, configId: title, title, year, manufacturer: "Williams", isConfigured: true, ...extra });
const TABLES = [
    table("Medieval Madness", 1997),
    table("Space Trip", undefined),
    table("Black Knight", 1980),
    table("Attack from Mars", 1995),
    table("Avatar", 2010),
    table("Bram Stoker's Dracula", 1993),
    table("Homebrew", 0, { manufacturer: "VPX Community" }),
    table("Eight Ball", 1977),
    table("Godzilla", 2021),
];
const play = seconds => ({ count: 1, seconds, lastPlayed: "2026-11-01T20:00:00" });
const PLAYS = { "Medieval Madness": play(4000), "Black Knight": play(3000), "Bram Stoker's Dracula": play(2000) };
const MOST_PLAYED_RANKING = ["Medieval Madness", "Black Knight", "Bram Stoker's Dracula"];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
let lang;

const currentTitle = () => fake.getCurrentTable().title;
const pageLines = () => fake.readFile(INFO_LOG).split("\n").filter(line => line.includes(" Page on "));
const chooseFilter = async (filterId) => {
    fake.chooseFilter(filterId);
    await settle();
};
const selectTable = (title) => {
    fake.moveWheel(fake.getWheelTables().findIndex(game => game.title === title));
};
const pressNextPage = (times) => {
    const reached = [];
    for (let press = 0; press < times; press += 1) {
        fake.pressPageButton("NextPage");
        reached.push(currentTitle());
    }
    return reached;
};

test("setup", async () => {
    fake.addFile(`${PROFILES}\\guest\\profile.json`, JSON.stringify({ version: 1, plays: PLAYS }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    ({ default: lang } = await import("../../common/core/i18n.js"));
    await import("../../main.js");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
});

test("alphabetical: Original Tables pages by first letter", async () => {
    await chooseFilter(ORIGINAL_TABLES);
    selectTable("Attack from Mars");

    assert.deepEqual(pressNextPage(5), ["Black Knight", "Eight Ball", "Godzilla", "Medieval Madness", "Space Trip"]);
    await settle();
    assert.match(pageLines().at(-1), /\[WheelOrder\] Next Page on User\.project\.OriginalTables, alphabetical: letter S, "Space Trip"\./);
});

test("Most Played Tables keeps one stop per table, with no Info Log line", async () => {
    await settle();
    const linesBefore = pageLines().length;
    await chooseFilter(MOST_PLAYED);
    selectTable(MOST_PLAYED_RANKING[0]);

    assert.deepEqual(pressNextPage(3), [...MOST_PLAYED_RANKING.slice(1), MOST_PLAYED_RANKING[0]]);
    await settle();
    assert.equal(pageLines().length, linesBefore);
});

test("by year: Tables to Discover pages by decade, the tables without a year last", async () => {
    fake.openMainMenu();
    fake.selectMenuItem(fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderAlphabetical);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderPageByYear);
    await chooseFilter(TABLES_TO_DISCOVER);
    assert.equal(fake.currentFilterId(), TABLES_TO_DISCOVER);
    selectTable("Eight Ball");

    // Eight Ball 1977, Attack from Mars 1995, Avatar 2010, Godzilla 2021, Homebrew and Space Trip without a year.
    assert.deepEqual(pressNextPage(5), ["Attack from Mars", "Avatar", "Godzilla", "Homebrew", "Eight Ball"]);
    await settle();
    assert.match(pageLines().at(-2), /Next Page on User\.project\.TablesToDiscover, by year: no year, "Homebrew"\./);
});

test("by year: Previous Page goes back decade by decade on Tables to Discover", () => {
    const reached = [];
    for (let press = 0; press < 3; press += 1) {
        fake.pressPageButton("PrevPage");
        reached.push(currentTitle());
    }

    assert.deepEqual(reached, ["Homebrew", "Godzilla", "Avatar"]);
});

test("a page press that leaves the wheel in place logs nothing, even after a filter change", async () => {
    await settle();
    const linesBefore = pageLines().length;
    fake.openMainMenu();
    fake.selectMenuItem(fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderByYear);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderPageAlphabetical);
    // Only tables starting with B: Original Tables has a single page group.
    fake.setTables(TABLES.filter(game => game.title.startsWith("B")));
    await chooseFilter(ORIGINAL_TABLES);
    const before = currentTitle();
    fake.pressPageButton("NextPage");
    assert.equal(currentTitle(), before);
    await chooseFilter(MOST_PLAYED);
    // PinballY fires "gameselect" when a filter change moves the selection (the fake does not).
    fake.fire("gameselect", { game: fake.getCurrentTable() });
    await settle();

    assert.equal(pageLines().length, linesBefore);
    assertNoErrorLogged(fake);
});
