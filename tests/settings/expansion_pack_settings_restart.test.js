// ============================================================
// Leaving the eXpansion Pack Settings through main.js: at once when every
// saved setting matches the running one; otherwise "Restart now" / "Later",
// Later (or Exit) back to the Operator Menu, Restart now asking PinballY's
// restart, logged, then Quit once the helper is ready. Attract mode closes
// the screens without the question.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { envKeyOf } from "../../common/core/env_overrides.js";
import { readDrawnMenu, drawnMenuLines, isDrawnMenuShown, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readLoader } from "../support/loader_reader.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const RESTART_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\restart_pinbally.ps1";
const fake = createFakePinballYHost({ now: new Date(2026, 9, 23, 20, 0, 0) });
const QUIT = fake.getBuiltInCommand("Quit");
// Saved as it runs: every Add-on off but Drawn Menus and High Scores.
const RUNNING_TEXT = Object.keys(config.addOns)
    .map(key => `${envKeyOf(`addOns.${key}`)}=${key === "drawnMenus" || key === "highScores"}\r\n`).join("") + "LANGUAGE=en\r\n";

function openList() {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
}

// Opens the list from the Operator Menu, then the High Scores' category.
function openPlayersAndProgress() {
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Players and progress");
    fake.advanceTime(OPEN_OVER_MS);
}

// From the category, Back to the list, then Back to leave it.
function backTwice() {
    chooseEntry(fake, "Back");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Back");
    fake.advanceTime(OPEN_OVER_MS);
}

// Flips the Add-on's switch on its page and saves it, back on its category.
function switchAndSave(line) {
    chooseEntry(fake, line);
    fake.advanceTime(OPEN_OVER_MS);
    press(fake, "Select");
    chooseEntry(fake, "Save");
    fake.advanceTime(OPEN_OVER_MS);
}

const isOnOperatorMenu = () => drawnMenuLines(fake).includes("eXpansion Pack Settings");

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    fake.addFile(RESTART_HELPER, "helper");
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus" || key === "highScores";
    config.language = "en";
    fake.addFile(ENV_LOCAL, RUNNING_TEXT);
    await import("../../main.js");
    await settle();
});

test("with nothing changed, Exit leaves the list at once", () => {
    openList();
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assert.ok(isOnOperatorMenu());
});

test("a change undone leaves at once too", () => {
    openPlayersAndProgress();
    switchAndSave("High Scores: On");
    switchAndSave("High Scores: Off (on restart)");
    backTwice();

    assert.ok(isOnOperatorMenu());
    assert.equal(fake.readFile(ENV_LOCAL), RUNNING_TEXT);
});

test("with a saved setting that differs, Back asks Restart now or Later", () => {
    openPlayersAndProgress();
    switchAndSave("High Scores: On");
    backTwice();

    assert.equal(readDrawnMenu(fake).message, "The saved settings apply when PinballY restarts.");
    assert.deepEqual(drawnMenuLines(fake), ["Restart now", "Later"]);
});

test("Later leaves for the Operator Menu, no restart asked", () => {
    chooseEntry(fake, "Later");
    fake.advanceTime(OPEN_OVER_MS);

    assert.ok(isOnOperatorMenu());
    assert.equal(fake.restartsAsked(), 0);
});

test("Exit asks too, and Exit on the question leaves as Later does", () => {
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(drawnMenuLines(fake), ["Restart now", "Later"]);

    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    assert.ok(isOnOperatorMenu());
    assert.equal(fake.restartsAsked(), 0);
});

test("attract mode closes the screens without the question", () => {
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
    fake.enterAttractMode();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(isDrawnMenuShown(fake), false);
    assert.equal(fake.restartsAsked(), 0);
    fake.exitAttractMode();
    fake.advanceTime(OPEN_OVER_MS);
});

test("Restart now asks one restart, logged, and PinballY quits once the helper is ready", () => {
    openList();
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Restart now");

    assert.equal(fake.restartsAsked(), 1);
    assert.ok(fake.logLines().includes("[ExpansionPackSettings] Restart asked."));
    assert.equal(isDrawnMenuShown(fake), false);
    assert.equal(readLoader(fake).shown, true, "the Loader turns over the dimmed wheel until PinballY quits");
    assert.equal(press(fake, "Select").defaultPrevented, true, "no button reaches the wheel meanwhile");
    fake.advanceTime(2000);
    assert.deepEqual(fake.executedCommands().filter(cmd => cmd === QUIT), [QUIT]);
    assert.ok(fake.logLines().includes("[ExpansionPackSettings] Restart helper ready, quitting."));
    assertNoErrorLogged(fake);
});
