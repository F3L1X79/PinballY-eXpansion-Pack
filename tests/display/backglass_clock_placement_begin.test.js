// ============================================================
// Backglass Clock Placement, through main.js on the fake PinballY globals:
// choosing the line shows a never-placed clock at the backglass screen's top
// right, with its borders, in front, drawn with the time, the minute ticking,
// and the Dialog on the wheel screen saying what to do.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { drawnMenuLines, readDrawnMenu, squeezed } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startPlacement, openCategory, openPlacement, BACKGLASS_RECT } from "./backglass_clock_placement_scenario.js";

const SWP_NOACTIVATE = 0x10;
// The wheel Clock's 30 px at 1920 px high, on this 1080 px high screen: 16.875, rounded.
const MARGIN = 17;
const DEFAULT_WIDTH = 320;

test("choosing the line shows the clock with its borders, in front, with the time", async () => {
    const fake = await startPlacement();
    const [clock] = fake.mediaWindows();
    openCategory(fake);
    assert.equal(clock.borderlessMode(), true);
    assert.equal(clock.isVisible(), false);

    openPlacement(fake);

    assert.equal(clock.isVisible(), true);
    assert.equal(clock.borderlessMode(), false, "its borders back, to drag and resize it");
    const rect = clock.windowRect();
    assert.equal(rect.right, BACKGLASS_RECT.right - MARGIN, "from the playfield screen to the default place");
    assert.equal(rect.left, BACKGLASS_RECT.right - MARGIN - DEFAULT_WIDTH);
    assert.equal(rect.top, BACKGLASS_RECT.top + MARGIN);
    const positions = clock.calls().filter(entry => entry.call === "setWindowPos");
    assert.equal(positions.at(-1).after, "TOPMOST", "raised last");
    assert.ok(positions.every(entry => entry.flags & SWP_NOACTIVATE), "never activating");
    const [layer] = clock.layers();
    assert.deepEqual(layer.texts(), ["9:47 PM", "9:47 PM"], "the real time, with its shadow");

    const dialog = readDrawnMenu(fake);
    assert.equal(dialog.title, "Backglass Clock Placement");
    assert.equal(squeezed(dialog.message), squeezed("Move and resize the clock on the backglass screen with the mouse, then choose Done."));
    assert.deepEqual(drawnMenuLines(fake), ["Done"]);

    fake.advanceTime(60 * 1000);
    assert.deepEqual(layer.texts(), ["9:48 PM", "9:48 PM"], "redrawn when the minute changes");
    assertNoErrorLogged(fake);
});
