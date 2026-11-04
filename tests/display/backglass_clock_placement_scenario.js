// ============================================================
// The Backglass Clock Placement's start: main.js on the fake host with Drawn
// Menus on, the clock running or not, then the eXpansion Pack Settings'
// "Launching and playing" category opened as the owner does. Never loaded by PinballY.
// ============================================================

import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { chooseEntry, drawnMenuLines, highlightedEntry, press, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";

export const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const CATEGORY = "Launching and playing a table";

export const PLACEMENT_LINE = "Place the Backglass Clock";
// The backglass screen, right of a 2560-wide playfield.
export const BACKGLASS_RECT = { left: 2560, top: 0, right: 4480, bottom: 1080 };
export const OWNER_PLACE = { left: 3900, top: 880, right: 4480, bottom: 1080 };

// clockRunning: what PinballY started with; savedClockOn: what .env.local says now.
export async function startPlacement({
    clockRunning = true, savedClockOn = true, monitorCount = 2, backglassWindowRect = BACKGLASS_RECT, ownerPlace = null,
} = {}) {
    const fake = createFakePinballYHost({
        now: new Date(2026, 10, 4, 21, 47, 30),
        monitorCount,
        backglassWindowRect,
        savedMediaWindowRects: ownerPlace ? { BackglassClock: ownerPlace } : {},
    });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    fake.addFile(ENV_LOCAL, `ADD_ON_BACKGLASS_CLOCK=${savedClockOn}\n`);
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus" || (clockRunning && key === "backglassClock");
    config.language = "en";
    await import("../../main.js");
    await settle();
    return fake;
}

// From the wheel to the category's page; returns its lines.
export function openCategory(fake) {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, CATEGORY);
    fake.advanceTime(OPEN_OVER_MS);
    return drawnMenuLines(fake);
}

export function openPlacement(fake) {
    chooseEntry(fake, PLACEMENT_LINE);
    fake.advanceTime(OPEN_OVER_MS);
}

// Back to the wheel from the category's page; "Later" past the restart question, if any.
export function leaveSettings(fake) {
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    if (drawnMenuLines(fake).includes("Later")) {
        chooseEntry(fake, "Later");
        fake.advanceTime(OPEN_OVER_MS);
    }
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
}

export function assertBackOnPlacementLine(fake) {
    assert.ok(drawnMenuLines(fake).includes(PLACEMENT_LINE), "the category's page");
    assert.equal(highlightedEntry(fake), PLACEMENT_LINE);
}

// The clock as the wheel always has it, with nothing left running for it.
export function assertPlacementEnded(fake, clock) {
    assert.equal(clock.borderlessMode(), true, "borderless again");
    assert.equal(clock.isVisible(), false, "hidden");
    assert.equal(clock.calls().filter(entry => entry.call === "setWindowPos" && "after" in entry).at(-1).after, "NOTOPMOST", "lowered");
    const callsAfterEnd = clock.calls().length;
    const textsAfterEnd = clock.layers()[0].texts();
    fake.advanceTime(5 * 60 * 1000);
    assert.equal(clock.calls().length, callsAfterEnd, "no raise left");
    assert.deepEqual(clock.layers()[0].texts(), textsAfterEnd, "no redraw left");
}
