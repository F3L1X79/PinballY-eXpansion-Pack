// ============================================================
// The Active Filter by year, through main.js with native menus: while the
// sorted copy stands in, the main menu entry names the filter the player
// chose and the Filter Picker marks it (its group, or the filter itself).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "wheelOrder"];
const FILTER_BY_ERA = "filter by era";
const ERA_1990S_CMD = 940;
const ERA_1990S_FILTER = "YearRange.1990.1999";

const table = (title, year) => ({ id: title, configId: title, title, year });
const TABLES = [table("Attack from Mars", 1995), table("Black Knight", 1980), table("Funhouse", 1990)];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
let lang;
let COMMAND;

const markedTitles = () => fake.currentMenu().items.filter(item => item.radio).map(item => item.title);
const entryTitle = () => fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title;
const closeMenus = () => { while (fake.currentMenu()) fake.pressExitInMenu(); };
const openFilterPicker = () => {
    fake.openMainMenu();
    fake.selectMenuItem(entryTitle());
};

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    ({ default: lang } = await import("../../common/core/i18n.js"));
    await import("../../main.js");
    await settle();
    COMMAND = globalThis.command;
    fake.setNativeCommand(COMMAND.ShowMainMenu, () => fake.openMainMenu());
    fake.setNativeCommand(COMMAND.FilterByEra, () => fake.openMenu(FILTER_BY_ERA, [
        { title: "1990s", cmd: ERA_1990S_CMD },
        { title: "", cmd: -1 },
        { title: "Back", cmd: COMMAND.MenuReturn },
    ]));
    fake.setNativeCommand(ERA_1990S_CMD, () => fake.chooseFilter(ERA_1990S_FILTER));
});

test("by year on All Tables, the entry names All Tables and the Filter Picker marks it", async () => {
    openFilterPicker();
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderAlphabetical);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderPageByYear);
    await settle();
    assert.equal(fake.currentFilterId(), "User.project.WheelOrder");

    fake.openMainMenu();
    assert.equal(entryTitle(), "Active filter: All Tables");
    fake.selectMenuItem(entryTitle());
    assert.deepEqual(markedTitles(), ["All Tables"]);
    closeMenus();
});

test("by year on an Era, the entry names that Era and the Filter Picker marks Filter by Era alone", async () => {
    openFilterPicker();
    fake.selectMenuItem("Filter by Era");
    fake.selectMenuItem("1990s");
    await settle();
    assert.equal(fake.currentFilterId(), "User.project.WheelOrder");

    fake.openMainMenu();
    assert.equal(entryTitle(), "Active filter: 1990s Tables");
    fake.selectMenuItem(entryTitle());
    assert.deepEqual(markedTitles(), ["Filter by Era"]);
    closeMenus();
    assertNoErrorLogged(fake);
});
