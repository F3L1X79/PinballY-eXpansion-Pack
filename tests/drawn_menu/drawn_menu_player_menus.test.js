// ============================================================
// The player's other menus as Drawn Menus through main.js: Exit, power off,
// filter, setup, operator and capture menus are drawn (the pause menu:
// drawn_menu_pause.test.js; categories: drawn_menu_categories.test.js). Submenus open in
// place and go back to their parent entry; long lists scroll and page.
// - A native menu opening replaces a Drawn one.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import {
    OPEN_OVER_MS, isDrawnMenuShown, drawnMenuLines, readDrawnMenu, highlightedEntry, press, openMainMenu, openExitMenu, openOperatorMenu, openMenu, chooseEntry,
} from "./drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "profilePicker", "drawnMenus"];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const PICKER_Z_RANGE = [6500, 6502];
const FILTER_BY_ERA = "filter by era";
// Command ids of PinballY's own filter entries, below the custom ones.
const ERA_SUBMENU_CMD = 950;
const ERA_BACK_CMD = 951;
const ERA_1970S_CMD = 952;
const ERA_1980S_CMD = 953;
const MANUFACTURERS = Array.from({ length: 40 }, (_, index) => `Manufacturer ${index + 1}`);

const fake = createFakePinballYHost({ now: new Date(2026, 9, 10, 20, 0, 0) });
let COMMAND;
let lang;
let appliedFilter = null;

const mainMenuWithFilters = () => [
    { title: "Play", cmd: COMMAND.PlayGame },
    { title: "", cmd: -1 },
    { title: "Filter by Era", cmd: ERA_SUBMENU_CMD, hasSubmenu: true },
];
const eraMenu = () => [
    { title: "1970s", cmd: ERA_1970S_CMD, radio: appliedFilter === "1970s" },
    { title: "1980s", cmd: ERA_1980S_CMD, radio: appliedFilter === "1980s" },
    { title: "", cmd: -1 },
    { title: "Back", cmd: ERA_BACK_CMD },
];
const pickerShown = () => fake.drawingLayers()
    .some(layer => layer.zIndex >= PICKER_Z_RANGE[0] && layer.zIndex <= PICKER_Z_RANGE[1] && layer.alpha > 0);

test("setup", async () => {
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    config.startupScreen = "welcome";
    ({ default: lang } = await import("../../common/core/i18n.js"));
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    COMMAND = globalThis.command;
    getProfileStore().switchTo("Bob");
    // What PinballY does itself on these commands.
    fake.setNativeCommand(ERA_SUBMENU_CMD, () => fake.openMenu(FILTER_BY_ERA, eraMenu()));
    fake.setNativeCommand(ERA_BACK_CMD, () => fake.openMenu("main", mainMenuWithFilters()));
    fake.setNativeCommand(COMMAND.ShowMainMenu, () => fake.openMenu("main", mainMenuWithFilters()));
    fake.setNativeCommand(ERA_1970S_CMD, () => { appliedFilter = "1970s"; });
    fake.setNativeCommand(ERA_1980S_CMD, () => { appliedFilter = "1980s"; });
    fake.setNativeCommand(COMMAND.PowerOff, () => fake.openMenu("power off", [
        { title: "Shut down the computer", cmd: 960 },
        { title: "", cmd: -1 },
        { title: "Cancel", cmd: COMMAND.MenuReturn },
    ]));
});

test("the Exit menu is drawn with the pack's entries", () => {
    openExitMenu(fake);

    assert.equal(fake.currentMenu(), null, "no native menu");
    assert.deepEqual(drawnMenuLines(fake), [
        "Exit PinballY", "Shut Down", "---",
        lang.profiles.menuEntry, lang.profileReset.menuEntry, "---",
        "Operator Menu", "---",
        "Help", "About PinballY", "---",
        "Cancel",
    ]);
    press(fake, "Exit");
});

test("Change Player in the Exit menu opens the Profile picker", () => {
    openExitMenu(fake);
    chooseEntry(fake, lang.profiles.menuEntry);

    assert.ok(!isDrawnMenuShown(fake));
    assert.ok(pickerShown());
    fake.fire("commandbuttondown", { command: "Exit", repeat: false });
    fake.advanceTime(1000);
    assert.ok(!pickerShown());
});

for (const [menuName, open] of [["Exit menu", openExitMenu], ["Operator Menu", openOperatorMenu]]) {
    test(`Manage profiles in the ${menuName} opens the Profile Reset list`, () => {
        open(fake);
        chooseEntry(fake, lang.profileReset.menuEntry);

        assert.equal(fake.currentMenu(), null);
        assert.ok(drawnMenuLines(fake).includes("Alice"), "the Profile Reset list is drawn in its place");
        press(fake, "Exit");
    });
}

test("Shut Down in the Exit menu draws the power off menu in its place", () => {
    openExitMenu(fake);
    chooseEntry(fake, "Shut Down");

    assert.equal(fake.currentMenu(), null);
    assert.deepEqual(drawnMenuLines(fake), ["Shut down the computer", "---", "Cancel"]);
    press(fake, "Exit");
    assert.ok(!isDrawnMenuShown(fake));
});

test("a filter submenu opened from the main Drawn Menu is drawn, with the active filter marked", () => {
    appliedFilter = "1970s";
    openMenu(fake, "main", mainMenuWithFilters());
    chooseEntry(fake, "Filter by Era");

    assert.equal(fake.currentMenu(), null);
    assert.deepEqual(readDrawnMenu(fake).rows, [
        { kind: "entry", title: "1970s", mark: "radio" },
        { kind: "entry", title: "1980s", mark: null },
        { kind: "separator" },
        { kind: "entry", title: "Back", mark: null },
    ]);
});

test("choosing a filter applies it", () => {
    chooseEntry(fake, "1980s");

    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.executedCommands().at(-1), ERA_1980S_CMD);
    assert.equal(appliedFilter, "1980s");
});

test("the submenu's Back entry goes back to the main menu, drawn", () => {
    openMenu(fake, "main", mainMenuWithFilters());
    chooseEntry(fake, "Filter by Era");
    chooseEntry(fake, "Back");

    assert.equal(fake.currentMenu(), null);
    assert.equal(drawnMenuLines(fake)[0], "Play");
    assert.equal(drawnMenuLines(fake).at(-1), "Filter by Era");
    press(fake, "Exit");
});

test("Exit in a filter submenu goes back to the main menu, the cursor on that filter", () => {
    openMenu(fake, "main", mainMenuWithFilters());
    chooseEntry(fake, "Filter by Era");
    const commandsBefore = fake.executedCommands().length;
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(fake.currentMenu(), null);
    assert.equal(drawnMenuLines(fake)[0], "Play");
    assert.equal(highlightedEntry(fake), "Filter by Era");
    assert.deepEqual(fake.executedCommands().slice(commandsBefore), [COMMAND.ShowMainMenu], "no filter applied");
    press(fake, "Exit");
    assert.ok(!isDrawnMenuShown(fake), "Exit in the main menu closes it");
});

test("a filter submenu's Cancel entry goes back to the main menu too", () => {
    openMenu(fake, "main", mainMenuWithFilters());
    chooseEntry(fake, "Filter by Era");
    fake.openMenu(FILTER_BY_ERA, [...eraMenu().slice(0, 3), { title: "Cancel", cmd: COMMAND.MenuReturn }]);
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Cancel");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(fake.currentMenu(), null);
    assert.equal(highlightedEntry(fake), "Filter by Era");
    press(fake, "Exit");
});

test("every filter menu is drawn", () => {
    for (const id of ["category", "era", "manuf", "rating", "system", "when added", "when played"].map(name => `filter by ${name}`)) {
        openMenu(fake, id, eraMenu());
        assert.ok(isDrawnMenuShown(fake), id);
        assert.equal(fake.currentMenu(), null, id);
        press(fake, "Exit");
    }
    // Back in the main menu.
    press(fake, "Exit");
});

test("a long filter list scrolls with the selection and pages with NextPage / PrevPage", () => {
    openMenu(fake, "filter by manuf", MANUFACTURERS.map((title, index) => ({ title, cmd: 2000 + index })));
    const shownTitles = () => drawnMenuLines(fake);

    assert.ok(shownTitles().length < MANUFACTURERS.length, "the list does not fit: only part of it shows");
    assert.equal(shownTitles()[0], MANUFACTURERS[0]);
    assert.equal(highlightedEntry(fake), MANUFACTURERS[0]);

    press(fake, "Prev");
    assert.equal(highlightedEntry(fake), MANUFACTURERS.at(-1), "Prev wraps to the last entry");
    assert.equal(shownTitles().at(-1), MANUFACTURERS.at(-1), "which scrolls into view");

    press(fake, "Next");
    assert.equal(highlightedEntry(fake), MANUFACTURERS[0], "Next wraps to the first entry");
    press(fake, "NextPage");
    const paged = MANUFACTURERS.indexOf(highlightedEntry(fake));
    assert.ok(paged > 1, "NextPage moves by more than one entry");
    assert.ok(shownTitles().includes(highlightedEntry(fake)), "the selection stays in view");
    press(fake, "PrevPage");
    assert.equal(highlightedEntry(fake), MANUFACTURERS[0], "PrevPage moves back by a page");
    assert.equal(shownTitles()[0], MANUFACTURERS[0]);
    for (let count = 0; count < 5; count++) press(fake, "NextPage");
    assert.equal(highlightedEntry(fake), MANUFACTURERS.at(-1), "NextPage stops at the last entry");
    assert.ok(shownTitles().includes(MANUFACTURERS.at(-1)));
    press(fake, "Exit");
    press(fake, "Exit");
});

test("the table's setup menu is drawn", () => {
    openMenu(fake, "game setup", [
        { title: "Edit Game Details", cmd: 3000 },
        { title: "Hide This Game", cmd: 3001, checked: true },
        { title: "", cmd: -1 },
        { title: "Back", cmd: COMMAND.MenuReturn },
    ]);

    assert.ok(isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu(), null);
    assert.deepEqual(drawnMenuLines(fake), ["Edit Game Details", "Hide This Game", "---", "Back"]);
    press(fake, "Exit");
});

test("the operator menu is drawn, the eXpansion Pack Settings and Manage profiles in their own group", () => {
    openOperatorMenu(fake);

    assert.equal(fake.currentMenu(), null);
    assert.deepEqual(drawnMenuLines(fake), [
        "Game Setup", "Batch Capture", "---", lang.expansionPackSettings.menuEntry, lang.profileReset.menuEntry, "---",
        "Reset Coins/Credits", "PinballY Options", "---",
        "Enable Videos", "Mute Videos", "---", "Help", "About PinballY", "---", "Cancel",
    ]);
    press(fake, "Exit");
    assert.ok(!isDrawnMenuShown(fake));
});

test("the capture menu is drawn", () => {
    openMenu(fake, "capture", [{ title: "Something", cmd: COMMAND.MenuReturn }]);
    assert.ok(isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu(), null);
    press(fake, "Exit");
});

test("a native menu opening replaces an open Drawn Menu", () => {
    openMainMenu(fake);
    fake.openMenu("media drop confirm", [{ title: "Something", cmd: COMMAND.MenuReturn }]);

    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu().id, "media drop confirm");
    assert.ok(!press(fake, "Next").defaultPrevented, "the buttons are left to the native menu");
    fake.closeMenu();
});
