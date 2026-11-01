// ============================================================
// The eXpansion Pack Settings list through main.js, Drawn Menus on: the
// Add-on categories, as in .env.example, each opening its page of Add-ons
// On / Off as saved in .env.local (read again on each opening), then the
// Language line; a category's Back returns to its line, Exit on the list to
// the Operator Menu; attract mode closes the list.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, drawnMenuLines, highlightedEntry, markedEntries, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const fake = createFakePinballYHost({ now: new Date(2026, 9, 22, 20, 0, 0) });

const CATEGORIES = ["Players and progress", "Wheel screen", "Menus and filters", "Launching and playing a table", "Debugging"];

const listLines = (language = "English") => [...CATEGORIES, "---", "Startup screen: Profile picker", `Language: ${language}`, "Offline Mode", "---", "Back"];

// Every Add-on but Drawn Menus runs off here: a saved On shows "on restart".
const ON = "On (on restart)";

// Each category's page as saved by default, but for what each test changes.
const categoryPages = ({ achievements = ON, clock = ON, menuCleanup = "Off" } = {}) => ({
    "Players and progress": [
        "[PLAYERS AND PROGRESS]",
        `Profile picker: ${ON}`, `Welcome Screen: ${ON}`, `Achievements: ${achievements}`, `Session stats: ${ON}`,
        `Challenges: ${ON}`, `Table Mastery: ${ON}`, `High Scores: ${ON}`, "---", "Back",
    ],
    "Wheel screen": ["[WHEEL SCREEN]", `Status line: ${ON}`, `Clock: ${clock}`, `Wheel Arc: ${ON}`, "---", "Back"],
    "Menus and filters": [
        "[MENUS AND FILTERS]",
        `PinballY translation: ${ON}`, "Drawn Menus: On", `Menu commands: ${ON}`, `Random table: ${ON}`, `Hall of Fame: ${ON}`,
        `Tables to Discover: ${ON}`, `Hidden Tables: ${ON}`, `Original Tables: ${ON}`, `Menu Cleanup: ${menuCleanup}`, "---", "Back",
    ],
    "Launching and playing a table": [
        "[LAUNCHING AND PLAYING A TABLE]",
        `Backglass: ${ON}`, "Backglass Clock: Off", `Launch overlay: ${ON}`, `Launch sound: ${ON}`, `Rating prompt: ${ON}`, `Table ROMs: ${ON}`, "---", "Back",
    ],
    "Debugging": ["[DEBUGGING]", `Launch events trace: ${ON}`, "---", "Back"],
});

// Each category's page, opened from the list in turn, left by its Back.
function readCategoryPages() {
    const pages = {};
    for (const category of CATEGORIES) {
        chooseEntry(fake, category);
        fake.advanceTime(OPEN_OVER_MS);
        pages[category] = drawnMenuLines(fake);
        chooseEntry(fake, "Back");
        fake.advanceTime(OPEN_OVER_MS);
        assert.equal(highlightedEntry(fake), category, "Back returns to the category's line");
    }
    return pages;
}

function openList() {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
}

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("the list shows the categories, each opening its Add-ons, as saved by default", () => {
    openList();

    assert.equal(fake.currentMenu(), null, "no native menu");
    assert.deepEqual(drawnMenuLines(fake), listLines());
    assert.deepEqual(markedEntries(fake, "submenu"), [...CATEGORIES, "Offline Mode"]);
    assert.equal(highlightedEntry(fake), "Players and progress");
    assert.deepEqual(readCategoryPages(), categoryPages());
});

test("on a category's page, the cursor starts on its first Add-on and Exit returns to the list", () => {
    chooseEntry(fake, "Wheel screen");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), `Status line: ${ON}`, "the cursor skips the heading");

    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(drawnMenuLines(fake), listLines());
    assert.equal(highlightedEntry(fake), "Wheel screen");
});

test("Exit goes back to the Operator Menu, past the restart question", () => {
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Later");
    fake.advanceTime(OPEN_OVER_MS);

    assert.ok(drawnMenuLines(fake).includes("PinballY Options"));
    assert.ok(drawnMenuLines(fake).includes("eXpansion Pack Settings"));
    press(fake, "Exit");
    assert.ok(!isDrawnMenuShown(fake));
});

test("the list shows .env.local as saved, read again on each opening", () => {
    fake.addFile(ENV_LOCAL, "\uFEFF# My cabinet\r\nADD_ON_ACHIEVEMENTS=false\r\nLANGUAGE=de\r\n");
    openList();
    assert.deepEqual(drawnMenuLines(fake), listLines("Deutsch (on restart)"));
    assert.deepEqual(readCategoryPages(), categoryPages({ achievements: "Off" }));
    chooseEntry(fake, "Back");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Later");
    assert.ok(drawnMenuLines(fake).includes("PinballY Options"), "Back goes back to the Operator Menu too");
    press(fake, "Exit");

    fake.addFile(ENV_LOCAL, "ADD_ON_CLOCK=false\nADD_ON_MENU_CLEANUP=true\nLANGUAGE=pt\n");
    openList();
    assert.deepEqual(drawnMenuLines(fake), listLines("Português (on restart)"));
    assert.deepEqual(readCategoryPages(), categoryPages({ clock: "Off", menuCleanup: ON }));
});

test("attract mode closes the list", () => {
    fake.enterAttractMode();

    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu(), null);
    assertNoErrorLogged(fake);
});
