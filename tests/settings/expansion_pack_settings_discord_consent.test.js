// ============================================================
// The consent Dialog of Discord Rich Presence, through main.js: saving On from
// off asks first, the cursor on Cancel; Cancel and Exit save nothing and go
// back to the page; Turn on saves as any Add-on switch; turning it off and
// any other Add-on never ask.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, highlightedEntry, press, chooseEntry, squeezed, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const fake = createFakePinballYHost({ now: new Date(2026, 10, 3, 20, 0, 0) });

function choose(line) {
    chooseEntry(fake, line);
    fake.advanceTime(OPEN_OVER_MS);
}

// From the Add-on's page: flips the switch, then Save.
function flipAndSave() {
    press(fake, "Select");
    choose("Save");
}

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");
    choose("Launching and playing a table");
});

test("saving On from off shows the Dialog with its text, the cursor on Cancel, nothing saved yet", () => {
    choose("Discord Rich Presence: Off");
    flipAndSave();

    const { title, message } = readDrawnMenu(fake);
    assert.equal(title, "Discord Rich Presence");
    assert.equal(squeezed(message), squeezed("Your Discord account open on this PC will publicly show the table being played, for how long, and when the wheel is open. No Profile name nor any other personal data from this PC is sent by the PinballY Expansion Pack."));
    assert.deepEqual(drawnMenuLines(fake), ["Turn on", "Cancel"]);
    assert.equal(highlightedEntry(fake), "Cancel");
    assert.equal(fake.readFile(ENV_LOCAL), undefined);
});

test("Cancel saves nothing and goes back to the page, on the saved choice", () => {
    choose("Cancel");

    assert.deepEqual(drawnMenuLines(fake), ["Discord Rich Presence: Off", "Cancel"]);
    assert.equal(fake.readFile(ENV_LOCAL), undefined);
});

test("Exit saves nothing and goes back to the page too", () => {
    flipAndSave();
    assert.equal(highlightedEntry(fake), "Cancel", "the Dialog asks again, the cursor on Cancel again");
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake), ["Discord Rich Presence: Off", "Cancel"]);
    assert.equal(fake.readFile(ENV_LOCAL), undefined);
});

test("Turn on saves it, marked on restart in its category", () => {
    flipAndSave();
    choose("Turn on");

    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_DISCORD_RICH_PRESENCE=true\r\n");
    assert.equal(highlightedEntry(fake), "Discord Rich Presence: On (on restart)");
    assert.equal(config.addOns.discordRichPresence, false, "the running setting stays until PinballY restarts");
});

test("while saved on, the page offers no Save, so no Dialog", () => {
    choose("Discord Rich Presence: On (on restart)");
    assert.deepEqual(drawnMenuLines(fake), ["Discord Rich Presence: On", "Cancel"]);

    press(fake, "Select");
    press(fake, "Select");
    assert.deepEqual(drawnMenuLines(fake), ["Discord Rich Presence: On", "Cancel"], "switched off and on again");
});

test("turning it off saves without a Dialog", () => {
    flipAndSave();

    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_DISCORD_RICH_PRESENCE=false\r\n");
    assert.equal(highlightedEntry(fake), "Discord Rich Presence: Off");
});

test("another Add-on's On saves without a Dialog", () => {
    choose("Backglass Clock: Off");
    flipAndSave();

    assert.equal(highlightedEntry(fake), "Backglass Clock: On (on restart)");
});

// Each time: the owner's earlier answer is not kept.
test("turning it on again asks again", () => {
    choose("Discord Rich Presence: Off");
    flipAndSave();

    assert.deepEqual(drawnMenuLines(fake), ["Turn on", "Cancel"]);
});

test("leaving the list after Turn on offers the restart", () => {
    choose("Turn on");
    choose("Back");
    choose("Back");

    assert.equal(readDrawnMenu(fake).message, "The saved settings apply when PinballY restarts.");
    choose("Later");
    assertNoErrorLogged(fake);
});
