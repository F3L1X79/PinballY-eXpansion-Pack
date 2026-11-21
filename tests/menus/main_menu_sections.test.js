// ============================================================
// The main menu's sections through main.js, Menu Cleanup off: what to play,
// the selected table with Table Setup, the pack's screens, unknown entries,
// what to change with the Filter Picker last, then Return alone; an empty
// section goes with its separator.
// - The one test of the whole order: others read their own section (support/main_menu_reader.js).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = [
    "uiTranslation", "customMenuCommands", "randomGame", "profilePicker", "achievements", "highScores", "startupChoicePrompt",
];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const SEPARATOR = "---";
// Any command the pack does not know.
const OTHER_SCRIPT_CMD = 3000;

const TABLES = [{ id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 }];

const fake = createFakePinballYHost({ now: new Date(2026, 8, 30, 20, 0, 0), tables: TABLES });
let lang;
let store;

const titlesOf = items => items.map(item => (item.cmd === -1 && !item.title ? SEPARATOR : item.title));
function mainMenuTitles(open = () => fake.openMainMenu()) {
    open();
    const titles = titlesOf(fake.currentMenu().items);
    fake.closeMenu();
    return titles;
}

test("setup", async () => {
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFolder(`${PROFILES}\\Bob`);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    ({ default: lang } = await import("../../common/core/i18n.js"));
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    store = getProfileStore();
    store.switchTo("Alice");
});

const toPlay = () => ["Play", lang.customMenuLabels.randomTable];
const selectedTable = () => ["Add to Favorites", "Rate Table", "Information", "Flyer", "Instruction Card"];
// Written out: the menu must read these exact names (#274).
const screens = () => ["My Profile", "My Achievements", lang.highScores.board.menuEntry];
const changeFilter = () => lang.customMenuLabels.activeFilter("All Tables");
const toChange = () => [lang.profiles.menuEntry, lang.welcomeScreen.menuEntry];
// The titles of the section at this place, counted from 0.
const section = (titles, place) => {
    const sections = [[]];
    for (const title of titles) {
        if (title === SEPARATOR) sections.push([]);
        else sections[sections.length - 1].push(title);
    }
    return sections[place];
};

test("the main menu runs what to play, the selected table, the pack's screens, what to change, then Return alone", () => {
    assert.deepEqual(mainMenuTitles(), [
        ...toPlay(), SEPARATOR,
        ...selectedTable(), lang.customMenuLabels.tableSetup, SEPARATOR,
        ...screens(), SEPARATOR,
        ...toChange(), changeFilter(), SEPARATOR,
        "Return",
    ]);
});

test("once the household has an Admin Profile, Table Setup ends the selected table's section for it only", () => {
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));

    assert.deepEqual(section(mainMenuTitles(), 1), selectedTable());
    store.switchTo("Bob");
    assert.deepEqual(section(mainMenuTitles(), 1), [...selectedTable(), lang.customMenuLabels.tableSetup]);
    store.switchTo("Alice");
});

test("PinballY's table entries take their places in the selected table's section, Remove from Favorites included", () => {
    const { PlayGame, GameInfo, Flyer, Instructions, RateGame, RemoveFavorite, MenuReturn } = globalThis.command;
    const titles = mainMenuTitles(() => fake.openMenu("main", [
        { title: "Play", cmd: PlayGame },
        { title: "Remove from Favorites", cmd: RemoveFavorite },
        { title: "Rate Table", cmd: RateGame },
        { title: "", cmd: -1 },
        { title: "Instruction Card", cmd: Instructions },
        { title: "Flyer", cmd: Flyer },
        { title: "Information", cmd: GameInfo },
        { title: "Return", cmd: MenuReturn },
    ]));
    assert.deepEqual(section(titles, 1), ["Remove from Favorites", "Rate Table", "Information", "Flyer", "Instruction Card"]);
});

test("entries the pack does not know keep their order in their own section, between the pack's screens and what to change", () => {
    const { PlayGame, Quit, FilterByEra, MenuReturn } = globalThis.command;
    const titles = mainMenuTitles(() => fake.openMenu("main", [
        { title: "Play", cmd: PlayGame },
        { title: "Quit PinballY", cmd: Quit },
        { title: "", cmd: -1 },
        { title: "Filter by Era", cmd: FilterByEra, hasSubmenu: true },
        { title: "Another script's entry", cmd: OTHER_SCRIPT_CMD },
        { title: "Return", cmd: MenuReturn },
    ]));
    assert.deepEqual(titles.slice(titles.indexOf(lang.highScores.board.menuEntry) + 1),
        [SEPARATOR, "Quit PinballY", "Another script's entry", SEPARATOR, ...toChange(), changeFilter(), SEPARATOR, "Return"]);
});

test("no section leaves a doubled, leading or trailing separator when PinballY lists nothing but Play", () => {
    const titles = mainMenuTitles(() => fake.openMenu("main", [
        { title: "", cmd: -1 },
        { title: "Play", cmd: globalThis.command.PlayGame },
        { title: "", cmd: -1 },
        { title: "", cmd: -1 },
    ]));
    assert.deepEqual(titles, [
        ...toPlay(), SEPARATOR,
        ...screens(), SEPARATOR,
        ...toChange(),
    ]);
    assertNoErrorLogged(fake);
});
