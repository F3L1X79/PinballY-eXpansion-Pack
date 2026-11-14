// ============================================================
// The Attract Order line of the eXpansion Pack Settings, through main.js:
// after the language, only while the Wheel Order Add-on is saved on; its
// page lists As PinballY, In Order and Whole Wheel. Saving one of the last two
// keeps PinballY's "Switch games every" and writes the long value (the other
// leaves it alone); As PinballY gives it back. All apply on restart.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, highlightedEntry, markedEntries, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const ENV_LOCAL = `${PACK}\\.env.local`;
const CABINET_FILE = `${PACK}\\profiles\\cabinet.json`;
const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0) });

const keptSwitchTime = () => JSON.parse(fake.readFile(CABINET_FILE)).attractOrderSwitchTime;
const switchTime = () => fake.storedSettings()[SWITCH_TIME_KEY];
const choose = (title) => {
    chooseEntry(fake, title);
    fake.advanceTime(OPEN_OVER_MS);
};

test("setup", async () => {
    fake.seedSettings({ [SWITCH_TIME_KEY]: 7 });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["drawnMenus", "wheelOrder"].includes(key);
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("the Attract Order line comes after the startup screen and the language", () => {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");

    assert.deepEqual(drawnMenuLines(fake).slice(6, 9), ["Startup screen: Profile picker", "Language: English", "Attract Order: As PinballY"]);
});

test("its page lists As PinballY, In Order and Whole Wheel, the saved one marked, then Cancel", () => {
    choose("Attract Order: As PinballY");

    assert.deepEqual(drawnMenuLines(fake), ["As PinballY", "In Order", "Whole Wheel", "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["As PinballY"]);
});

test("saving In Order keeps PinballY's interval and writes the long value, shown on restart", () => {
    choose("In Order");

    assert.equal(fake.readFile(ENV_LOCAL), "ATTRACT_ORDER=inOrder\r\n");
    assert.equal(highlightedEntry(fake), "Attract Order: In Order (on restart)");
    assert.equal(keptSwitchTime(), 7);
    assert.equal(switchTime(), "86400");
});

test("saving In Order again leaves PinballY's option and the kept value alone", () => {
    choose("Attract Order: In Order (on restart)");
    choose("In Order");

    assert.equal(keptSwitchTime(), 7);
    assert.equal(switchTime(), "86400");
});

test("saving Whole Wheel from In Order leaves PinballY's option and the kept value alone", () => {
    choose("Attract Order: In Order (on restart)");
    choose("Whole Wheel");

    assert.equal(fake.readFile(ENV_LOCAL), "ATTRACT_ORDER=wholeWheel\r\n");
    assert.equal(highlightedEntry(fake), "Attract Order: Whole Wheel (on restart)");
    assert.equal(keptSwitchTime(), 7);
    assert.equal(switchTime(), "86400");
});

test("saving In Order from Whole Wheel leaves them alone too", () => {
    choose("Attract Order: Whole Wheel (on restart)");
    choose("In Order");

    assert.equal(keptSwitchTime(), 7);
    assert.equal(switchTime(), "86400");
});

test("saving As PinballY gives the kept value back and forgets it", () => {
    choose("Attract Order: In Order (on restart)");
    choose("As PinballY");

    assert.equal(fake.readFile(ENV_LOCAL), "ATTRACT_ORDER=pinballY\r\n");
    assert.equal(highlightedEntry(fake), "Attract Order: As PinballY");
    assert.equal(keptSwitchTime(), undefined);
    assert.equal(switchTime(), "7");
});

test("the line is not listed while the Wheel Order Add-on is saved off", () => {
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    fake.addFile(ENV_LOCAL, "ATTRACT_ORDER=pinballY\r\nADD_ON_WHEEL_ORDER=false\r\n");
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");

    assert.equal(drawnMenuLines(fake).some(line => line.startsWith("Attract Order")), false);
    assertNoErrorLogged(fake);
});
