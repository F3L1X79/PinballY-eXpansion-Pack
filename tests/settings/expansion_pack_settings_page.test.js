// ============================================================
// An Add-on's page in the eXpansion Pack Settings, through main.js: its
// "When on" / "When off" texts, the switch flipping in place, Save shown only
// while it differs from the saved choice, Save rewriting that one line of
// .env.local, "on restart" in its category; Cancel, Back and Exit change nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, readDrawnMenu, drawnMenuLines, highlightedEntry, press, chooseEntry, squeezed, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const fake = createFakePinballYHost({ now: new Date(2026, 9, 22, 20, 0, 0) });

function openList() {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
}

function openCategory(category) {
    chooseEntry(fake, category);
    fake.advanceTime(OPEN_OVER_MS);
}

// From a category: the cursor walks down to the line.
function openPage(line) {
    for (let guard = 0; highlightedEntry(fake) !== line; guard++) {
        if (guard > 100) throw new Error(`No "${line}" line in the list.`);
        press(fake, "Next");
    }
    press(fake, "Select");
    fake.advanceTime(OPEN_OVER_MS);
}

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.addOns.achievements = true;
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("an Add-on's page says what it does, what else is lost, and offers its switch and Cancel", () => {
    openList();
    openCategory("Players and progress");
    openPage("Achievements: On");

    const { message, messageBold } = readDrawnMenu(fake);
    assert.equal(squeezed(message), squeezed("On: Achievements earned while playing, each announced by a toast. Off: No Player Level."));
    assert.match(message, /toast\.\nOff: /, "Off starts a line of its own");
    assert.deepEqual(messageBold, ["On:", "Off:"]);
    assert.deepEqual(drawnMenuLines(fake), ["Achievements: On", "Cancel"]);
    assert.equal(highlightedEntry(fake), "Achievements: On");
});

test("the switch flips in place, Save shown only while it differs from the saved choice", () => {
    press(fake, "Select");
    assert.deepEqual(drawnMenuLines(fake), ["Achievements: Off", "Save", "Cancel"]);
    assert.equal(highlightedEntry(fake), "Achievements: Off", "the cursor stays on the switch");

    press(fake, "Select");
    assert.deepEqual(drawnMenuLines(fake), ["Achievements: On", "Cancel"]);
    assert.equal(highlightedEntry(fake), "Achievements: On");
});

// Cancel is the page's MenuReturn entry, its Back.
test("Cancel and Exit forget the switch and return to the category on that line, nothing written", () => {
    press(fake, "Select");
    chooseEntry(fake, "Cancel");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Achievements: On", "Cancel");

    openPage("Achievements: On");
    press(fake, "Select");
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Achievements: On", "Exit");

    openPage("Achievements: On");
    assert.deepEqual(drawnMenuLines(fake), ["Achievements: On", "Cancel"], "the unsaved switch forgotten");
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(fake.readFile(ENV_LOCAL), undefined);
    assert.deepEqual(fake.fileOperations().filter(operation => operation.path === ENV_LOCAL), []);
});

test("without .env.local, Save creates it with the one line and the category shows \"on restart\"", () => {
    openPage("Achievements: On");
    press(fake, "Select");
    chooseEntry(fake, "Save");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_ACHIEVEMENTS=false\r\n");
    assert.equal(highlightedEntry(fake), "Achievements: Off (on restart)");
    assert.ok(fake.logLines().includes("[ExpansionPackSettings] Saved ADD_ON_ACHIEVEMENTS=false in .env.local."));
});

test("Save changes only that key's line, the rest of the file byte for byte", () => {
    const text = "\uFEFF# My cabinet\r\nADD_ON_TABLE_ROMS=false\r\n# ADD_ON_ACHIEVEMENTS=false\r\n\r\nADD_ON_ACHIEVEMENTS=false\r\nLANGUAGE=en\r\n";
    fake.addFile(ENV_LOCAL, text);
    openPage("Achievements: Off (on restart)");
    assert.deepEqual(drawnMenuLines(fake), ["Achievements: Off", "Cancel"], "the page shows the saved choice, without \"on restart\"");
    press(fake, "Select");
    chooseEntry(fake, "Save");
    fake.advanceTime(OPEN_OVER_MS);

    // The BOM aside: the host reads past it, and the real ADODB.Stream writes
    // it back, which the fake one does not.
    const expected = text.replace("\uFEFF", "").replace("\r\nADD_ON_ACHIEVEMENTS=false", "\r\nADD_ON_ACHIEVEMENTS=true");
    assert.equal(fake.readFile(ENV_LOCAL), expected);
    assert.equal(highlightedEntry(fake), "Achievements: On", "saving the running value again clears \"on restart\"");
});

// The Clock runs off here, but saved on by default: no line in the file.
test("a key with no active line gets one appended at the end", () => {
    chooseEntry(fake, "Back");
    fake.advanceTime(OPEN_OVER_MS);
    openCategory("Wheel screen");
    openPage("Clock: On (on restart)");
    press(fake, "Select");
    chooseEntry(fake, "Save");
    fake.advanceTime(OPEN_OVER_MS);

    assert.ok(fake.readFile(ENV_LOCAL).endsWith("LANGUAGE=en\r\nADD_ON_CLOCK=false\r\n"));
    assert.equal(highlightedEntry(fake), "Clock: Off");
});

test("attract mode closes the page, its switch forgotten", () => {
    const before = fake.readFile(ENV_LOCAL);
    openPage("Clock: Off");
    press(fake, "Select");
    fake.enterAttractMode();

    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.readFile(ENV_LOCAL), before);
    assertNoErrorLogged(fake);
});
