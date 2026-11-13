// ============================================================
// The Wheel Order through main.js with native menus: the Filter Picker's
// entry before Back switches the wheel to by year (oldest first, ties by
// title, no year last) on All Tables, Favorites and an Era, keeps it when
// another filter is picked, and switches back, the same table selected.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "wheelOrder"];
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const CABINET_FILE = `${PACK}\\profiles\\cabinet.json`;
const INFO_LOG = `${PACK}\\logs\\info.log`;
const SEPARATOR = "---";
const FILTER_BY_ERA = "filter by era";
const ERA_1990S_CMD = 940;
const ERA_1990S_FILTER = "YearRange.1990.1999";

const table = (title, year, extra = {}) => ({ id: title, configId: title, title, year, ...extra });
// In PinballY's alphabetical order, as the fake's All Tables lists them.
const TABLES = [
    table("Attack from Mars", 1995, { isFavorite: true }),
    table("Black Knight", 1980),
    table("Cirqus Voltaire", 1997, { isFavorite: true }),
    table("Dracula", 1993),
    table("Eight Ball", 1977, { isFavorite: true }),
    table("Funhouse", 1990),
    table("Homebrew", 0, { isFavorite: true }),
    table("Medieval Madness", 1997),
    table("Old Secret", 1985, { isHidden: true }),
    table("Space Trip", undefined),
];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 13, 20, 0, 0), tables: TABLES });
let lang;
let COMMAND;

const titlesOf = items => items.map(item => (item.cmd === -1 && !item.title ? SEPARATOR : item.title));
const wheelTitles = () => fake.getWheelTables().map(game => game.title);
const currentTitle = () => fake.getCurrentTable().title;
const savedWheelOrder = () => JSON.parse(fake.readFile(CABINET_FILE)).wheelOrder;
const openFilterPicker = () => {
    fake.openMainMenu();
    fake.selectMenuItem(lang.customMenuLabels.activeFilter(fake.getCurrentFilterTitle()));
};
const closeMenus = () => { while (fake.currentMenu()) fake.pressExitInMenu(); };
const chooseInFilterPicker = async (title) => {
    openFilterPicker();
    fake.selectMenuItem(title);
    await settle();
};
// The wheel read from a known first table: the order, whatever the selection.
const orderFrom = (first) => {
    const titles = wheelTitles();
    const start = titles.indexOf(first);
    return [...titles.slice(start), ...titles.slice(0, start)];
};

const BY_YEAR_ALL = [
    "Eight Ball", "Black Knight", "Funhouse", "Dracula", "Attack from Mars", "Cirqus Voltaire", "Medieval Madness",
    "Homebrew", "Space Trip",
];

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    ({ default: lang } = await import("../../common/core/i18n.js"));
    await import("../../main.js");
    await settle();
    COMMAND = globalThis.command;
    // What PinballY does itself on these commands: a filter's command fires
    // "filterselect" before the filter is applied.
    fake.setNativeCommand(COMMAND.ShowMainMenu, () => fake.openMainMenu());
    fake.setNativeCommand(globalThis.gameList.getFilterInfo("All").cmd, () => fake.chooseFilter("All"));
    fake.setNativeCommand(globalThis.gameList.getFilterInfo("Favorites").cmd, () => fake.chooseFilter("Favorites"));
    fake.setNativeCommand(COMMAND.FilterByEra, () => fake.openMenu(FILTER_BY_ERA, [
        { title: "1990s", cmd: ERA_1990S_CMD },
        { title: "", cmd: -1 },
        { title: "Back", cmd: COMMAND.MenuReturn },
    ]));
    fake.setNativeCommand(ERA_1990S_CMD, () => fake.chooseFilter(ERA_1990S_FILTER));
});

test("the Filter Picker shows the Wheel Order entry just before Back, alphabetical by default", () => {
    openFilterPicker();

    assert.deepEqual(titlesOf(fake.currentMenu().items).slice(-3), [
        SEPARATOR, lang.customMenuLabels.wheelOrderAlphabetical, lang.customMenuLabels.filterPickerBack,
    ]);
    closeMenus();
});

test("choosing it lists All Tables by year, closes the menus, keeps the table and saves the order", async () => {
    fake.moveWheel(3);
    assert.equal(currentTitle(), "Dracula");

    await chooseInFilterPicker(lang.customMenuLabels.wheelOrderAlphabetical);

    assert.equal(fake.currentMenu(), null);
    assert.equal(currentTitle(), "Dracula");
    assert.deepEqual(orderFrom("Eight Ball"), BY_YEAR_ALL);
    assert.equal(savedWheelOrder(), "byYear");
    openFilterPicker();
    assert.ok(titlesOf(fake.currentMenu().items).includes(lang.customMenuLabels.wheelOrderByYear));
    closeMenus();
});

test("picking Favorites keeps the order by year", async () => {
    await chooseInFilterPicker("Favorites");

    assert.deepEqual(orderFrom("Eight Ball"), ["Eight Ball", "Attack from Mars", "Cirqus Voltaire", "Homebrew"]);
});

test("picking an Era keeps the order by year", async () => {
    openFilterPicker();
    fake.selectMenuItem("Filter by Era");
    fake.selectMenuItem("1990s");
    await settle();

    assert.equal(fake.currentMenu(), null);
    assert.deepEqual(orderFrom("Funhouse"), ["Funhouse", "Dracula", "Attack from Mars", "Cirqus Voltaire", "Medieval Madness"]);
});

test("picking All Tables again keeps the order by year, the selected table kept", async () => {
    fake.moveWheel(1);
    assert.equal(currentTitle(), "Dracula");

    await chooseInFilterPicker("All Tables");

    assert.equal(currentTitle(), "Dracula");
    assert.deepEqual(orderFrom("Eight Ball"), BY_YEAR_ALL);
});

test("the Info Log answers the cabinet checks", () => {
    const infoLog = fake.readFile(INFO_LOG);

    assert.match(infoLog, /\[WheelOrder\] testGame of All keeps 0 of 1 Hidden tables; the copy shows 9 tables, All's getGames\(\) 9\./);
    assert.match(infoLog, /\[WheelOrder\] a listener registered after the cancelling one received the cancelled filterselect\./);
});

test("switching back shows All Tables in PinballY's order, the same table selected, and saves it", async () => {
    await chooseInFilterPicker(lang.customMenuLabels.wheelOrderByYear);

    assert.equal(fake.currentMenu(), null);
    assert.equal(fake.currentFilterId(), "All");
    assert.equal(currentTitle(), "Dracula");
    assert.deepEqual(orderFrom("Attack from Mars"), TABLES.filter(game => !game.isHidden).map(game => game.title));
    assert.equal(savedWheelOrder(), "alphabetical");
    assertNoErrorLogged(fake);
});
