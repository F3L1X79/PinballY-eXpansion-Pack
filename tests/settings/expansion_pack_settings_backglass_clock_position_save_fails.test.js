// ============================================================
// A Backglass Clock Position that cannot be saved, through main.js: .env.local
// held by another program, the error logged, "Setting not saved" with OK, the
// page back on the place saved before, and the clock keeps its place.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, markedEntries, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { errorLines } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const SAVED_TEXT = "ADD_ON_BACKGLASS_CLOCK=true\r\n";
const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
// 1920x1080, right of a 2560-wide playfield. Margin: 30 px at 1920 px high,
// on 1080 px high: 16.875, rounded to 17. The window comes out 320x200.
const BACKGLASS_RECT = { left: 2560, top: 0, right: 4480, bottom: 1080 };
const TOP_RIGHT_RECT = { left: 4143, top: 17, right: 4463, bottom: 217 };
const fake = createFakePinballYHost({
    now: new Date(2026, 9, 22, 20, 0, 0),
    tables: [TABLE],
    monitorCount: 2,
    backglassWindowRect: BACKGLASS_RECT,
});

function choose(entry) {
    chooseEntry(fake, entry);
    fake.advanceTime(OPEN_OVER_MS);
}

function exit() {
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
}

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus" || key === "backglassClock";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("a place that cannot be saved shows \"Setting not saved\", logged, the file unchanged", () => {
    fake.addFile(ENV_LOCAL, SAVED_TEXT);
    fake.lockFile(ENV_LOCAL);
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");
    choose("Launching and playing a table");
    choose("Backglass Clock Position: Top right");
    choose("Bottom left");

    assert.equal(readDrawnMenu(fake).message, "Setting not saved");
    assert.deepEqual(drawnMenuLines(fake), ["OK"]);
    assert.equal(fake.readFile(ENV_LOCAL), SAVED_TEXT);
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /^\[ExpansionPackSettings\] .*Permission denied/);
});

test("OK goes back to the page, on the place saved before", () => {
    choose("OK");
    assert.deepEqual(markedEntries(fake, "radio"), ["Top right"]);
});

test("the next game shows the clock at its place, with no other error", () => {
    // The page, the category, the list (whose restart question Later closes), the Operator Menu.
    exit();
    exit();
    exit();
    exit();
    exit();
    const [clock] = fake.mediaWindows();
    fake.playGame(TABLE);
    assert.deepEqual(clock.windowRect(), TOP_RIGHT_RECT);
    fake.gameStarted(TABLE);
    fake.gameOver(TABLE);
    assert.equal(errorLines(fake).length, 1);
});
