// ============================================================
// The Language page of the eXpansion Pack Settings, through main.js: the six
// languages in their own names, the saved one marked, choosing one rewriting
// the LANGUAGE line of .env.local and "on restart" in the list; Cancel, Back
// and Exit change nothing; the screens stay in the running language.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, highlightedEntry, markedEntries, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const LANGUAGES = ["English", "Français", "Deutsch", "Español", "Italiano", "Português"];
const fake = createFakePinballYHost({ now: new Date(2026, 9, 22, 20, 0, 0) });

function openList() {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
}

function openLanguagePage(line) {
    chooseEntry(fake, line);
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

test("the Language page lists the six languages in their own names, the saved one marked, then Cancel", () => {
    fake.addFile(ENV_LOCAL, "LANGUAGE=en\r\n");
    openList();
    openLanguagePage("Language: English");

    assert.deepEqual(drawnMenuLines(fake), [...LANGUAGES, "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["English"]);
    assert.equal(highlightedEntry(fake), "English", "the cursor opens on the saved language");
});

// Cancel is the page's MenuReturn entry, its Back.
test("Cancel and Exit return to the list on the Language line, nothing written", () => {
    const before = fake.readFile(ENV_LOCAL);
    chooseEntry(fake, "Cancel");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Language: English", "Cancel");

    openLanguagePage("Language: English");
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Language: English", "Exit");

    assert.equal(fake.readFile(ENV_LOCAL), before);
    assert.deepEqual(fake.fileOperations().filter(operation => operation.path === ENV_LOCAL), []);
});

test("choosing a language rewrites only the LANGUAGE line and the list shows it \"on restart\"", () => {
    const text = "# My cabinet\r\nADD_ON_CLOCK=false\r\n# LANGUAGE=de\r\nLANGUAGE=en\r\n";
    fake.addFile(ENV_LOCAL, text);
    openLanguagePage("Language: English");
    chooseEntry(fake, "Français");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(fake.readFile(ENV_LOCAL), text.replace("\r\nLANGUAGE=en", "\r\nLANGUAGE=fr"));
    assert.equal(highlightedEntry(fake), "Language: Français (on restart)");
    assert.ok(fake.logLines().includes("[ExpansionPackSettings] Saved LANGUAGE=fr in .env.local."));
});

test("the screens stay in the running language, the new saved one marked", () => {
    assert.ok(drawnMenuLines(fake).includes("Wheel screen"), "the list still in English");
    openLanguagePage("Language: Français (on restart)");
    assert.deepEqual(drawnMenuLines(fake), [...LANGUAGES, "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["Français"]);
});

test("choosing the running language again clears \"on restart\"", () => {
    chooseEntry(fake, "English");
    fake.advanceTime(OPEN_OVER_MS);

    assert.ok(fake.readFile(ENV_LOCAL).endsWith("# LANGUAGE=de\r\nLANGUAGE=en\r\n"));
    assert.equal(highlightedEntry(fake), "Language: English");
});

// The pack runs in English with LANGUAGE=EN: i18n.js ignores the case.
test("a language written by hand in capitals is the running one, marked", () => {
    fake.addFile(ENV_LOCAL, "LANGUAGE=EN\r\n");
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    press(fake, "Exit");
    openList();

    // Found only without "on restart".
    openLanguagePage("Language: English");
    assert.deepEqual(markedEntries(fake, "radio"), ["English"]);
    assertNoErrorLogged(fake);
});
