// ============================================================
// The Attract Order line of the eXpansion Pack Settings, through main.js:
// on the Wheel page under its Add-ons, whether the Wheel Order Add-on is on or off; its
// page lists As PinballY, In Order and Whole Wheel. Saving one of the last two
// keeps PinballY's "Switch games every" and writes the long value (the other
// leaves it alone); only As PinballY gives it back, never Wheel Order saved off.
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

test("the Attract Order line is on the Wheel page, after its Add-ons, a separator and the Wheel Guides lines", () => {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");
    assert.equal(drawnMenuLines(fake).some(line => line.startsWith("Attract Order")), false, "not on the list itself");
    choose("Wheel");

    assert.deepEqual(drawnMenuLines(fake).slice(-9), [
        "Wheel Order: On", "---",
        "Wheel Rail: On", "Rail by year: Decades only", "Wheel Position: On", "Favorite Heart: On",
        "Attract Order: As PinballY", "---", "Back",
    ]);
});

test("its page lists As PinballY, In Order and Whole Wheel, the saved one marked, then Cancel", () => {
    choose("Attract Order: As PinballY");

    assert.deepEqual(drawnMenuLines(fake), ["As PinballY", "In Order", "Whole Wheel", "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["As PinballY"]);
});

test("saving In Order keeps PinballY's interval and writes the long value, shown on restart, back on its line", () => {
    choose("In Order");

    assert.equal(fake.readFile(ENV_LOCAL), "ATTRACT_ORDER=inOrder\r\n");
    assert.equal(drawnMenuLines(fake)[0], "[WHEEL]", "back on the Wheel page");
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

test("saving the Wheel Order Add-on off leaves the Attract Order and PinballY's option alone", () => {
    choose("Attract Order: As PinballY");
    choose("Whole Wheel");
    assert.equal(keptSwitchTime(), 7);

    choose("Wheel Order: On");
    press(fake, "Select");
    choose("Save");

    assert.match(fake.readFile(ENV_LOCAL), /ADD_ON_WHEEL_ORDER=false/);
    assert.match(fake.readFile(ENV_LOCAL), /ATTRACT_ORDER=wholeWheel/);
    assert.equal(keptSwitchTime(), 7);
    assert.equal(switchTime(), "86400");
});

test("with the Wheel Order Add-on saved off, the line is listed and saving it writes PinballY's option", () => {
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    fake.addFile(ENV_LOCAL, "ATTRACT_ORDER=wholeWheel\r\nADD_ON_WHEEL_ORDER=false\r\n");
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");
    choose("Wheel");
    assert.equal(drawnMenuLines(fake).includes("Attract Order: Whole Wheel (on restart)"), true);

    choose("Attract Order: Whole Wheel (on restart)");
    choose("As PinballY");

    assert.equal(keptSwitchTime(), undefined);
    assert.equal(switchTime(), "7");
    assertNoErrorLogged(fake);
});
