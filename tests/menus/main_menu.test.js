// ============================================================
// Main menu module tests: entries land in their sections in fixed position
// order whatever the Add-ons' order, PinballY's other items below; a label
// function is read at each opening; selecting runs the action; reopening on
// an entry puts the cursor on it. Other menus are left alone.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createMainMenu, MAIN_MENU_POSITION } from "../../common/menus/main_menu.js";
import lang from "../../common/core/i18n.js";
import { mainMenuSection } from "../support/main_menu_reader.js";

function setUp() {
    const fake = createFakePinballYHost();
    const mainMenu = createMainMenu(fake);
    const PLAY = { title: "Play", cmd: fake.getBuiltInCommand("PlayGame") };
    const RETURN = { title: "Return", cmd: fake.getBuiltInCommand("MenuReturn") };
    const openMainMenu = () => fake.openMenu("main", [PLAY, RETURN]);
    return { fake, mainMenu, openMainMenu };
}

const titles = menu => menu.items.map(item => item.title);
// A separator has no title.
const SEPARATOR = undefined;

test("entries sit in their sections and position order, whatever order they were added in", () => {
    const { fake, mainMenu, openMainMenu } = setUp();
    mainMenu.add({ name: "stats", label: "Stats", position: MAIN_MENU_POSITION.PROFILE_STATS, action: () => {} });
    mainMenu.add({ name: "welcome", label: "Welcome", position: MAIN_MENU_POSITION.WELCOME_SCREEN, action: () => {} });
    mainMenu.add({ name: "board", label: "Board", position: MAIN_MENU_POSITION.HIGH_SCORE_BOARD, action: () => {} });
    mainMenu.add({ name: "player", label: "Player", position: MAIN_MENU_POSITION.PROFILE_PICKER, action: () => {} });
    mainMenu.add({ name: "list", label: "List", position: MAIN_MENU_POSITION.ACHIEVEMENT_LIST, action: () => {} });
    mainMenu.add({ name: "setup", label: "Setup", position: MAIN_MENU_POSITION.TABLE_SETUP, action: () => {} });

    openMainMenu();

    assert.deepEqual(titles(fake.currentMenu()),
        ["Play", SEPARATOR, "Setup", SEPARATOR, "Stats", "List", "Board", SEPARATOR, "Player", "Welcome", SEPARATOR, "Return"]);
    assert.ok(fake.currentMenu().items.filter(item => item.title === SEPARATOR).every(item => item.cmd === -1));
});

test("a section with no shown entry adds no separator", () => {
    const { fake, mainMenu, openMainMenu } = setUp();
    let boardShown = true;
    mainMenu.add({ name: "board", label: "Board", position: MAIN_MENU_POSITION.HIGH_SCORE_BOARD, action: () => {}, shownWhen: () => boardShown });
    mainMenu.add({ name: "list", label: "List", position: MAIN_MENU_POSITION.ACHIEVEMENT_LIST, action: () => {} });

    openMainMenu();
    assert.deepEqual(titles(fake.currentMenu()), ["Play", SEPARATOR, "List", "Board", SEPARATOR, "Return"]);
    fake.closeMenu();

    boardShown = false;
    openMainMenu();
    assert.deepEqual(titles(fake.currentMenu()), ["Play", SEPARATOR, "List", SEPARATOR, "Return"]);
});

test("PinballY's separators give way to the sections': none doubled, leading or trailing", () => {
    const { fake, mainMenu } = setUp();
    mainMenu.add({ name: "setup", label: "Setup", position: MAIN_MENU_POSITION.TABLE_SETUP, action: () => {} });
    mainMenu.add({ name: "board", label: "Board", position: MAIN_MENU_POSITION.HIGH_SCORE_BOARD, action: () => {} });
    const play = { title: "Play", cmd: fake.getBuiltInCommand("PlayGame") };
    const rate = { title: "Rate", cmd: fake.getBuiltInCommand("RateGame") };

    fake.openMenu("main", [{ title: "", cmd: -1 }, play, { title: "", cmd: -1 }, { cmd: -1 }, rate, { title: "", cmd: -1 }]);
    assert.deepEqual(titles(fake.currentMenu()), ["Play", SEPARATOR, "Rate", "Setup", SEPARATOR, "Board"]);
    fake.closeMenu();

    fake.openMenu("main", [play]);
    assert.deepEqual(titles(fake.currentMenu()), ["Play", SEPARATOR, "Setup", SEPARATOR, "Board"]);
});

test("PinballY's items go to their sections: the selected table's before Table Setup, the unknown ones, the Filter Picker for the selections and the groups, then Return alone", () => {
    const { fake, mainMenu } = setUp();
    mainMenu.add({ name: "board", label: "Board", position: MAIN_MENU_POSITION.HIGH_SCORE_BOARD, action: () => {} });
    mainMenu.add({ name: "setup", label: "Setup", position: MAIN_MENU_POSITION.TABLE_SETUP, action: () => {} });
    const native = name => fake.getBuiltInCommand(name);

    fake.openMenu("main", [
        { title: "Return", cmd: native("MenuReturn") },
        { title: "Other", cmd: 3000 },
        { title: "Era", cmd: native("FilterByEra") },
        { title: "All Tables", cmd: native("FilterFirst") },
        { title: "Favorite", cmd: native("AddFavorite") },
        { title: "Info", cmd: native("GameInfo") },
        { title: "Play", cmd: native("PlayGame") },
        { title: "Rating", cmd: native("FilterByRating") },
        { title: "Favorites", cmd: native("FilterLast") },
        { title: "Another", cmd: 3001 },
    ]);

    assert.deepEqual(titles(fake.currentMenu()), [
        "Play", SEPARATOR, "Favorite", "Info", "Setup", SEPARATOR, "Board", SEPARATOR,
        "Other", "Another", SEPARATOR, lang.customMenuLabels.activeFilter("All Tables"), SEPARATOR, "Return",
    ]);
});

test("an entry's label given as a function is read at each opening", () => {
    const { fake, mainMenu } = setUp();
    let label = "First";
    mainMenu.add({ name: "board", label: () => label, position: MAIN_MENU_POSITION.HIGH_SCORE_BOARD, action: () => {} });
    const open = () => fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);

    assert.deepEqual(mainMenuSection(fake, "First", open), ["First"]);
    label = "Second";
    assert.deepEqual(mainMenuSection(fake, "Second", open), ["Second"]);
});

test("the entries are added again each time the main menu opens, and only to the main menu", () => {
    const { fake, mainMenu, openMainMenu } = setUp();
    mainMenu.add({ name: "list", label: "List", position: MAIN_MENU_POSITION.ACHIEVEMENT_LIST, action: () => {} });

    fake.openMenu("exit", [{ title: "Quit", cmd: 98 }]);
    assert.deepEqual(titles(fake.currentMenu()), ["Quit"]);
    fake.closeMenu();

    openMainMenu();
    fake.closeMenu();
    openMainMenu();
    assert.deepEqual(titles(fake.currentMenu()), ["Play", SEPARATOR, "List", SEPARATOR, "Return"]);
});

test("selecting an entry runs its action, and only its own", async () => {
    const { fake, mainMenu, openMainMenu } = setUp();
    const runs = [];
    mainMenu.add({ name: "list", label: "List", position: MAIN_MENU_POSITION.ACHIEVEMENT_LIST, action: () => runs.push("list") });
    mainMenu.add({ name: "player", label: "Player", position: MAIN_MENU_POSITION.PROFILE_PICKER, action: async () => runs.push("player") });

    openMainMenu();
    fake.selectMenuItem("Player");
    await Promise.resolve();

    assert.deepEqual(runs, ["player"]);
});

test("an entry with a shown-when predicate appears only when it holds, checked on each opening", () => {
    const { fake, mainMenu, openMainMenu } = setUp();
    let shown = false;
    mainMenu.add({ name: "list", label: "List", position: MAIN_MENU_POSITION.ACHIEVEMENT_LIST, action: () => {} });
    mainMenu.add({ name: "welcome", label: "Welcome", position: MAIN_MENU_POSITION.WELCOME_SCREEN, action: () => {}, shownWhen: () => shown });

    openMainMenu();
    assert.deepEqual(titles(fake.currentMenu()), ["Play", SEPARATOR, "List", SEPARATOR, "Return"]);
    fake.closeMenu();

    shown = true;
    openMainMenu();
    assert.deepEqual(titles(fake.currentMenu()), ["Play", SEPARATOR, "List", SEPARATOR, "Welcome", SEPARATOR, "Return"]);
});

test("with every entry hidden by its predicate, PinballY's items are still sorted", () => {
    const { fake, mainMenu, openMainMenu } = setUp();
    mainMenu.add({ name: "welcome", label: "Welcome", position: MAIN_MENU_POSITION.WELCOME_SCREEN, action: () => {}, shownWhen: () => false });

    openMainMenu();

    assert.deepEqual(titles(fake.currentMenu()), ["Play", SEPARATOR, "Return"]);
});

test("a failing shown-when predicate hides only its own entry", () => {
    const { fake, mainMenu, openMainMenu } = setUp();
    mainMenu.add({ name: "list", label: "List", position: MAIN_MENU_POSITION.ACHIEVEMENT_LIST, action: () => {} });
    mainMenu.add({ name: "welcome", label: "Welcome", position: MAIN_MENU_POSITION.WELCOME_SCREEN, action: () => {},
        shownWhen: () => { throw new Error("broken"); } });

    openMainMenu();

    assert.deepEqual(titles(fake.currentMenu()), ["Play", SEPARATOR, "List", SEPARATOR, "Return"]);
});

test("reopening on an entry shows the main menu with the cursor on it, once", () => {
    const { fake, mainMenu, openMainMenu } = setUp();
    mainMenu.add({ name: "list", label: "List", position: MAIN_MENU_POSITION.ACHIEVEMENT_LIST, action: () => {} });
    mainMenu.add({ name: "stats", label: "Stats", position: MAIN_MENU_POSITION.PROFILE_STATS, action: () => {} });
    mainMenu.add({ name: "setup", label: "Setup", position: MAIN_MENU_POSITION.TABLE_SETUP, action: () => {} });
    const selectedTitles = () => fake.currentMenu().items.filter(item => item.selected).map(item => item.title);

    mainMenu.reopenOn("stats");

    assert.equal(fake.executedCommands().at(-1), fake.getBuiltInCommand("ShowMainMenu"));
    openMainMenu();
    assert.deepEqual(selectedTitles(), ["Stats"]);
    fake.closeMenu();
    openMainMenu();
    assert.deepEqual(selectedTitles(), [], "the next opening starts as usual");
});
