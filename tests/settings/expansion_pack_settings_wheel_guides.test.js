// ============================================================
// The Wheel Rail, Rail by year, Wheel Position and Favorite Heart lines of the
// eXpansion Pack Settings, through main.js: on the Wheel page above the Attract
// Order while the Wheel Guides Add-on is saved on, Rail by year only while the
// Wheel Rail is saved on too; each choice saves its one .env.local line.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, highlightedEntry, markedEntries, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const fake = createFakePinballYHost({ now: new Date(2026, 10, 21, 20, 0, 0) });

const choose = (title) => {
    chooseEntry(fake, title);
    fake.advanceTime(OPEN_OVER_MS);
};

// The Wheel page's lines after its Add-ons' separator.
const settingLines = () => {
    const lines = drawnMenuLines(fake);
    return lines.slice(lines.indexOf("---") + 1, lines.lastIndexOf("---"));
};

test("setup", async () => {
    fake.addFile(ENV_LOCAL, "LANGUAGE=en\r\n");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["drawnMenus", "wheelGuides"].includes(key);
    config.language = "en";
    await import("../../main.js");
    await settle();
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");
    choose("Wheel");
});

test("with Wheel Guides and the Wheel Rail on, the four lines sit between the separator and the Attract Order", () => {
    assert.deepEqual(settingLines(), [
        "Wheel Rail: On",
        "Rail by year: Decades",
        "Wheel Position: On",
        "Favorite Heart: On",
        "Attract Order: As PinballY",
    ]);
});

test("Rail by year's page offers Decades and Decades and years, the cursor on the saved one", () => {
    choose("Rail by year: Decades");

    assert.deepEqual(drawnMenuLines(fake), ["Decades", "Decades and years", "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["Decades"]);
    assert.equal(highlightedEntry(fake), "Decades");
});

test("choosing Decades and years writes only WHEEL_RAIL_YEARS, shown on restart on its line", () => {
    choose("Decades and years");

    assert.equal(fake.readFile(ENV_LOCAL), "LANGUAGE=en\r\nWHEEL_RAIL_YEARS=true\r\n");
    // The fake's fixed-width measure cuts this long line; PinballY shrinks it first.
    assert.ok(highlightedEntry(fake).startsWith("Rail by year: Decades and years (on"), highlightedEntry(fake));
    assert.equal(config.wheelRailYears, false, "the running setting stays until PinballY restarts");
});

test("turning the Wheel Rail off writes WHEEL_RAIL and hides Rail by year at once", () => {
    choose("Wheel Rail: On");
    assert.deepEqual(drawnMenuLines(fake), ["On", "Off", "---", "Cancel"]);
    choose("Off");

    assert.equal(fake.readFile(ENV_LOCAL), "LANGUAGE=en\r\nWHEEL_RAIL_YEARS=true\r\nWHEEL_RAIL=false\r\n");
    assert.equal(highlightedEntry(fake), "Wheel Rail: Off (on restart)");
    assert.deepEqual(settingLines(), [
        "Wheel Rail: Off (on restart)",
        "Wheel Position: On",
        "Favorite Heart: On",
        "Attract Order: As PinballY",
    ]);
});

test("turning the Wheel Position and the Favorite Heart off writes their own lines", () => {
    choose("Wheel Position: On");
    choose("Off");
    assert.equal(highlightedEntry(fake), "Wheel Position: Off (on restart)");
    choose("Favorite Heart: On");
    choose("Off");
    assert.equal(highlightedEntry(fake), "Favorite Heart: Off (on restart)");

    assert.equal(fake.readFile(ENV_LOCAL),
        "LANGUAGE=en\r\nWHEEL_RAIL_YEARS=true\r\nWHEEL_RAIL=false\r\nWHEEL_POSITION=false\r\nFAVORITE_HEART=false\r\n");
});

test("turning the Wheel Guides Add-on off on its page hides the four lines", () => {
    choose("Wheel Guides: On");
    press(fake, "Select");
    choose("Save");

    assert.deepEqual(settingLines(), ["Attract Order: As PinballY"]);
});

test("leaving the list with these lines changed asks to restart", () => {
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(readDrawnMenu(fake).message, "The saved settings apply when PinballY restarts.");
    choose("Later");
});

test("opened again with Wheel Guides saved off, the Wheel page still lists none of the four lines", () => {
    fake.addFile(ENV_LOCAL, "ADD_ON_WHEEL_GUIDES=false\r\nWHEEL_RAIL=true\r\n");
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");
    choose("Wheel");

    assert.deepEqual(settingLines(), ["Attract Order: As PinballY"]);
    assertNoErrorLogged(fake);
});
