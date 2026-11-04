// ============================================================
// The Backglass Clock Position's line in the eXpansion Pack Settings, through
// main.js: right under the clock's On/Off line while the clock is saved on,
// at the top right by default, absent while it is saved off.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const fake = createFakePinballYHost({ now: new Date(2026, 9, 22, 20, 0, 0) });

function openCategory() {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Launching and playing a table");
    fake.advanceTime(OPEN_OVER_MS);
}

function leaveToWheel() {
    for (let presses = 0; presses < 3; presses++) {
        press(fake, "Exit");
        fake.advanceTime(OPEN_OVER_MS);
    }
}

function lineUnderTheClockIn(lines) {
    return lines[lines.findIndex(line => line.startsWith("Backglass Clock:")) + 1];
}

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus" || key === "backglassClock";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("with the clock saved on, the line comes right under the clock's, at its default place", () => {
    fake.addFile(ENV_LOCAL, "ADD_ON_BACKGLASS_CLOCK=true\r\n");
    openCategory();
    assert.equal(lineUnderTheClockIn(drawnMenuLines(fake)), "Backglass Clock Position: Top right");
});

test("the line shows the saved place, read again at each opening", () => {
    leaveToWheel();
    fake.addFile(ENV_LOCAL, "ADD_ON_BACKGLASS_CLOCK=true\r\nBACKGLASS_CLOCK_POSITION=bottomCenter\r\n");
    openCategory();
    assert.equal(lineUnderTheClockIn(drawnMenuLines(fake)), "Backglass Clock Position: Bottom middle");
});

test("with the clock saved off, the line is absent", () => {
    leaveToWheel();
    fake.addFile(ENV_LOCAL, "ADD_ON_BACKGLASS_CLOCK=false\r\nBACKGLASS_CLOCK_POSITION=bottomCenter\r\n");
    openCategory();
    const lines = drawnMenuLines(fake);
    assert.ok(lines.includes("Backglass Clock: Off (on restart)"), "the clock's own line stays");
    assert.ok(!lines.some(line => line.startsWith("Backglass Clock Position")));
    assertNoErrorLogged(fake);
});
