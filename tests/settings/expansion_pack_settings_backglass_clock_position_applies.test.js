// ============================================================
// A Backglass Clock Position chosen in the eXpansion Pack Settings, through
// main.js: saved in .env.local, the clock there at the next game with no
// restart; the line never shows "on restart" and no restart question is asked.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { envKeyOf } from "../../common/core/env_overrides.js";
import { drawnMenuLines, highlightedEntry, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
// 1920x1080, right of a 2560-wide playfield. Margin: 30 px at 1920 px high,
// on 1080 px high: 16.875, rounded to 17. The window comes out 320x200.
const BACKGLASS_RECT = { left: 2560, top: 0, right: 4480, bottom: 1080 };
const TOP_RIGHT_RECT = { left: 4143, top: 17, right: 4463, bottom: 217 };
const BOTTOM_LEFT_RECT = { left: 2577, top: 863, right: 2897, bottom: 1063 };
const IS_RUNNING = key => key === "drawnMenus" || key === "backglassClock";
// Saved as it runs, so that only this setting could ask the restart question.
const RUNNING_TEXT = Object.keys(config.addOns)
    .map(key => `${envKeyOf(`addOns.${key}`)}=${IS_RUNNING(key)}\r\n`).join("") + "LANGUAGE=en\r\n";
const fake = createFakePinballYHost({
    now: new Date(2026, 9, 22, 20, 0, 0),
    tables: [TABLE],
    monitorCount: 2,
    backglassWindowRect: BACKGLASS_RECT,
});
let clock = null;

function choose(entry) {
    chooseEntry(fake, entry);
    fake.advanceTime(OPEN_OVER_MS);
}

function exit() {
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
}

function playAGame() {
    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    const rect = clock.windowRect();
    fake.gameOver(TABLE);
    return rect;
}

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = IS_RUNNING(key);
    config.language = "en";
    await import("../../main.js");
    await settle();
    [clock] = fake.mediaWindows();
});

test("a game before any choice shows the clock at the top right", () => {
    fake.addFile(ENV_LOCAL, RUNNING_TEXT);
    assert.deepEqual(playAGame(), TOP_RIGHT_RECT);
});

test("a choice is saved in .env.local, its line showing no \"on restart\"", () => {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");
    choose("Launching and playing a table");
    choose("Backglass Clock Position: Top right");
    choose("Bottom left");

    assert.equal(fake.readFile(ENV_LOCAL), `${RUNNING_TEXT}BACKGLASS_CLOCK_POSITION=bottomLeft\r\n`);
    assert.equal(highlightedEntry(fake), "Backglass Clock Position: Bottom left");
});

test("leaving the settings asks no restart question", () => {
    exit();
    exit();
    assert.ok(drawnMenuLines(fake).includes("eXpansion Pack Settings"), "straight back to the Operator Menu");
    exit();
});

test("the next game shows the clock at the chosen place, with no restart", () => {
    assert.deepEqual(playAGame(), BOTTOM_LEFT_RECT);
    assertNoErrorLogged(fake);
});
