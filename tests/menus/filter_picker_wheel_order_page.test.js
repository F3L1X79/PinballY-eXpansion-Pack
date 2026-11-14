// ============================================================
// The Wheel Order page through main.js with native menus: the Filter
// Picker's entry opens it without changing anything; it lists the two
// orders, the current one marked and selected, then Back. Back and Exit go
// up to the Filter Picker on the entry; an order chosen is put in place.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "wheelOrder"];
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const CABINET_FILE = `${PACK}\\profiles\\cabinet.json`;
const SEPARATOR = "---";

const table = (title, year) => ({ id: title, configId: title, title, year });
const TABLES = [table("Attack from Mars", 1995), table("Black Knight", 1980), table("Dracula", 1993)];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
let LABELS;

const titlesOf = items => items.map(item => (item.cmd === -1 && !item.title ? SEPARATOR : item.title));
const currentTitle = () => fake.getCurrentTable().title;
const wheelTitles = () => fake.getWheelTables().map(game => game.title);
const cabinetData = () => JSON.parse(fake.readFile(CABINET_FILE) ?? "{}");
const selectedTitle = () => fake.currentMenu().items.find(item => item.selected).title;
const closeMenus = () => { while (fake.currentMenu()) fake.pressExitInMenu(); };
const openFilterPicker = () => {
    fake.openMainMenu();
    fake.selectMenuItem(fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title);
};
const openWheelOrderPage = (entryLabel) => {
    openFilterPicker();
    fake.selectMenuItem(entryLabel);
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
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
});

test("the Filter Picker's Wheel Order entry carries the submenu arrow", () => {
    openFilterPicker();

    const entry = fake.currentMenu().items.find(item => item.title === LABELS.wheelOrderAlphabetical);
    assert.equal(entry.hasSubmenu, true);
    closeMenus();
});

test("choosing the entry opens the Wheel Order page, the current order marked and selected, nothing changed", async () => {
    openWheelOrderPage(LABELS.wheelOrderAlphabetical);
    await settle();

    assert.deepEqual(titlesOf(fake.currentMenu().items), [
        LABELS.wheelOrderPage, SEPARATOR, LABELS.wheelOrderPageAlphabetical, LABELS.wheelOrderPageByYear, SEPARATOR, LABELS.filterPickerBack,
    ]);
    assert.deepEqual(fake.currentMenu().items.filter(item => item.radio).map(item => item.title), [LABELS.wheelOrderPageAlphabetical]);
    assert.equal(selectedTitle(), LABELS.wheelOrderPageAlphabetical);
    assert.deepEqual(wheelTitles(), ["Attack from Mars", "Black Knight", "Dracula"]);
    assert.equal(cabinetData().wheelOrder, undefined);
});

test("Exit on the page goes back to the Filter Picker, the cursor on the Wheel Order entry", () => {
    fake.pressExitInMenu();

    assert.equal(fake.currentMenu().id, "filter picker");
    assert.equal(selectedTitle(), LABELS.wheelOrderAlphabetical);
});

test("Back on the page does the same", () => {
    fake.selectMenuItem(LABELS.wheelOrderAlphabetical);
    fake.selectMenuItem(LABELS.filterPickerBack);

    assert.equal(fake.currentMenu().id, "filter picker");
    assert.equal(selectedTitle(), LABELS.wheelOrderAlphabetical);
    closeMenus();
});

test("choosing the current order closes the menus and changes nothing", async () => {
    openWheelOrderPage(LABELS.wheelOrderAlphabetical);
    fake.selectMenuItem(LABELS.wheelOrderPageAlphabetical);
    await settle();

    assert.equal(fake.currentMenu(), null);
    assert.equal(fake.currentFilterId(), "All");
    assert.deepEqual(wheelTitles(), ["Attack from Mars", "Black Knight", "Dracula"]);
    assert.equal(cabinetData().wheelOrder, undefined);
});

test("choosing the other order switches the wheel, keeps the table, saves it and closes the menus", async () => {
    fake.moveWheel(2);
    assert.equal(currentTitle(), "Dracula");

    openWheelOrderPage(LABELS.wheelOrderAlphabetical);
    fake.selectMenuItem(LABELS.wheelOrderPageByYear);
    await settle();

    assert.equal(fake.currentMenu(), null);
    assert.equal(currentTitle(), "Dracula");
    assert.equal(cabinetData().wheelOrder, "byYear");
    const titles = wheelTitles();
    const start = titles.indexOf("Black Knight");
    assert.deepEqual([...titles.slice(start), ...titles.slice(0, start)], ["Black Knight", "Dracula", "Attack from Mars"]);
});

test("the entry then names the new order, and the page marks it", () => {
    openFilterPicker();
    assert.ok(titlesOf(fake.currentMenu().items).includes(LABELS.wheelOrderByYear));

    fake.selectMenuItem(LABELS.wheelOrderByYear);
    assert.deepEqual(fake.currentMenu().items.filter(item => item.radio).map(item => item.title), [LABELS.wheelOrderPageByYear]);
    assert.equal(selectedTitle(), LABELS.wheelOrderPageByYear);
    closeMenus();
    assertNoErrorLogged(fake);
});
