// ============================================================
// By year with Drawn Menus, through main.js: an Era picked in the drawn
// Filter by Era menu shows only that Era's tables, oldest first.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { OPEN_OVER_MS, drawnMenuLines, openMainMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "drawnMenus", "wheelOrder"];
const ERA_1990S_CMD = 940;
const ERA_1990S_FILTER = "YearRange.1990.1999";

const table = (title, year) => ({ id: title, configId: title, title, year });
const TABLES = [
    table("Attack from Mars", 1995), table("Black Knight", 1980), table("Dracula", 1993),
    table("Eight Ball", 1977), table("Funhouse", 1990),
];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 20, 20, 0, 0), tables: TABLES });
let LABELS;

const wheelTitles = () => fake.getWheelTables().map(game => game.title);
const choose = (title) => {
    chooseEntry(fake, title);
    fake.advanceTime(OPEN_OVER_MS);
};

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    LABELS = lang.customMenuLabels;
    await import("../../main.js");
    await settle();
    const COMMAND = globalThis.command;
    // What PinballY does itself on these commands: a filter's command fires
    // "filterselect" before the filter is applied.
    fake.setNativeCommand(COMMAND.ShowMainMenu, () => fake.openMainMenu());
    fake.setNativeCommand(COMMAND.FilterByEra, () => fake.openMenu("filter by era", [
        { title: "1990s", cmd: ERA_1990S_CMD },
        { title: "", cmd: -1 },
        { title: "Back", cmd: COMMAND.MenuReturn },
    ]));
    fake.setNativeCommand(ERA_1990S_CMD, () => fake.chooseFilter(ERA_1990S_FILTER));
});

test("by year, the 1990s picked in the drawn Era menu shows only the 1990s, oldest first", async () => {
    openMainMenu(fake);
    choose(LABELS.changeFilter);
    choose(LABELS.wheelOrderAlphabetical);
    choose(LABELS.wheelOrderPageByYear);
    await settle();

    openMainMenu(fake);
    choose(LABELS.changeFilter);
    choose("Filter by Era");
    assert.equal(drawnMenuLines(fake)[0], "1990s");
    choose("1990s");
    await settle();

    const wheel = wheelTitles();
    const start = wheel.indexOf("Funhouse");
    assert.deepEqual([...wheel.slice(start), ...wheel.slice(0, start)], ["Funhouse", "Dracula", "Attack from Mars"]);
    assertNoErrorLogged(fake);
});
