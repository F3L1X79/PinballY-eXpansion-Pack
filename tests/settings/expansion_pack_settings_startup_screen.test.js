// ============================================================
// The Startup screen line of the eXpansion Pack Settings, through main.js:
// its page lists the three Startup Screens, the saved one marked, then
// Cancel; choosing one saves STARTUP_SCREEN at once, the line then "on
// restart", and leaving asks Restart now or Later.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { envKeyOf } from "../../common/core/env_overrides.js";
import { readDrawnMenu, drawnMenuLines, highlightedEntry, markedEntries, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const fake = createFakePinballYHost({ now: new Date(2026, 9, 23, 20, 0, 0) });
const SCREENS = ["Welcome Screen", "Profile picker", "Wheel"];

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("the Startup screen line comes before the language, with the saved screen", () => {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake).slice(5, 8), ["---", "Startup screen: Profile picker", "Language: English"]);
});

test("its page lists the three Startup Screens, the saved one marked, then Cancel", () => {
    chooseEntry(fake, "Startup screen: Profile picker");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake), [...SCREENS, "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["Profile picker"]);
    assert.equal(highlightedEntry(fake), "Profile picker");

    chooseEntry(fake, "Cancel");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Startup screen: Profile picker", "Cancel returns on the line");
    assert.equal(fake.readFile(ENV_LOCAL), undefined, "nothing written");
});

test("choosing a screen saves STARTUP_SCREEN at once, shown on restart", () => {
    chooseEntry(fake, "Startup screen: Profile picker");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Wheel");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(fake.readFile(ENV_LOCAL), "STARTUP_SCREEN=wheel\r\n");
    assert.ok(fake.logLines().includes("[ExpansionPackSettings] Saved STARTUP_SCREEN=wheel in .env.local."));
    assert.equal(highlightedEntry(fake), "Startup screen: Wheel (on restart)");
});

test("the Startup screen alone differing still asks Restart now or Later on leaving", () => {
    // Every Add-on saved as it runs: only the screen differs.
    fake.addFile(ENV_LOCAL, `${Object.keys(config.addOns).map(key => `${envKeyOf(`addOns.${key}`)}=${key === "drawnMenus"}\r\n`).join("")}STARTUP_SCREEN=wheel\r\n`);
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(readDrawnMenu(fake).message, "The saved settings apply when PinballY restarts.");
    assertNoErrorLogged(fake);
});
