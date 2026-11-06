// ============================================================
// Menu Cleanup through main.js: off by default, native menus keep everything;
// on, Help, About, information entries and some filter submenus are gone for
// every Profile and out of the Filter Picker, with no stray separator.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { mainMenuSection, mainMenuHasStraySeparator, filterPickerSection } from "../support/main_menu_reader.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const markAdmin = (fake, name) =>
    fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));

// Separators, titled "" (PinballY's) or untitled (the main menu module's), read "---".
const SEPARATOR = "---";
// The Filter Picker's entry, naming the Active Filter.
const FILTER_PICKER = "Active filter: All Tables";
const INFORMATION_ENTRIES = ["Information", "Flyer", "Table Scores", "Instruction Card"];
const CLEANED_ADMIN_EXIT_MENU = ["Exit PinballY", "Shut Down", SEPARATOR, "Manage profiles", SEPARATOR, "Operator Menu", SEPARATOR, "Cancel"];
const CLEANED_EXIT_MENU_WITHOUT_OPERATOR_MENU = ["Exit PinballY", "Shut Down", SEPARATOR, "Cancel"];

const fake = createFakePinballYHost({ now: new Date(2026, 8, 30, 20, 0, 0) });

function titlesOf(open) {
    open();
    const titles = fake.currentMenu().items.map(item => (item.cmd === -1 ? SEPARATOR : item.title));
    fake.closeMenu();
    return titles;
}
// The main menu's sections Menu Cleanup leaves, around the Filter Picker's entry.
function assertCleanedMainMenu(firstBlock) {
    assert.deepEqual(INFORMATION_ENTRIES.filter(entry => mainMenuSection(fake, entry) !== null), [], "no information entry");
    assert.deepEqual(mainMenuSection(fake, "Play"), firstBlock);
    assert.deepEqual(mainMenuSection(fake, "Rate Table"), ["Rate Table", "Add to Favorites", FILTER_PICKER]);
    assert.deepEqual(mainMenuSection(fake, "Return"), ["Return"]);
    assert.equal(mainMenuHasStraySeparator(fake), false);
}
const exitMenuTitles = () => titlesOf(() => fake.openExitMenu());

test("Menu Cleanup, the Backglass Clock and Discord Rich Presence are the only Add-ons off by default", () => {
    const offByDefault = Object.entries(config.addOns).filter(([, isOn]) => !isOn).map(([key]) => key);
    assert.deepEqual(offByDefault.sort(), ["backglassClock", "discordRichPresence", "menuCleanup"]);
});

test("turned on, Menu Cleanup lightens the menus for every Profile, Admin included", async () => {
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFolder(`${PROFILES}\\Bob`);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = key === "customMenuCommands" || key === "menuCleanup";
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const LABELS = lang.customMenuLabels;
    await import("../../main.js");
    const store = getProfileStore();
    markAdmin(fake, "Bob");

    store.switchTo("Alice");
    assertCleanedMainMenu(["Play"]);
    assert.deepEqual(exitMenuTitles(), CLEANED_EXIT_MENU_WITHOUT_OPERATOR_MENU);

    store.switchTo("Bob");
    assertCleanedMainMenu(["Play", LABELS.tableSetup]);
    assert.deepEqual(exitMenuTitles(), CLEANED_ADMIN_EXIT_MENU);

    assertNoErrorLogged(fake);
});

test("no doubled, leading or trailing separator is left, titled or not", async () => {
    // Not an Admin Profile: no Reset profile entry at the end.
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    getProfileStore().switchTo("Alice");
    const { Help, AboutBox, Quit } = globalThis.command;
    fake.openMenu("exit", [
        { title: "Help", cmd: Help },
        { title: "", cmd: -1 },
        { cmd: -1 },
        { title: "Exit PinballY", cmd: Quit },
        { cmd: -1 },
        { title: "", cmd: -1 },
        { title: "About PinballY", cmd: AboutBox },
    ]);
    assert.deepEqual(fake.currentMenu().items.map(item => item.title), ["Exit PinballY"]);
    fake.closeMenu();
});

test("the filter submenus by system, last played and date added stay out of the Filter Picker, the others are there", () => {
    assert.deepEqual(filterPickerSection(fake, "Filter by Era"), [
        "Filter by Era", "Filter by Manufacturer", "Filter by Category", "Filter by Rating",
    ]);
    assertNoErrorLogged(fake);
});

test("Help and About leave the Operator menu too", () => {
    const { ShowGameSetupMenu, Help, AboutBox, MenuReturn } = globalThis.command;
    fake.openMenu("operator", [
        { title: "Game Setup", cmd: ShowGameSetupMenu },
        { title: "", cmd: -1 },
        { title: "Help", cmd: Help },
        { title: "About PinballY", cmd: AboutBox },
        { title: "", cmd: -1 },
        { title: "Cancel", cmd: MenuReturn },
    ]);
    assert.deepEqual(fake.currentMenu().items.map(item => (item.cmd === -1 ? SEPARATOR : item.title)),
        ["Game Setup", SEPARATOR, "Cancel"]);
    fake.closeMenu();
});
