// ============================================================
// The Discord Rich Presence line of the Offline Mode group, through main.js:
// the very same saved value as the Add-on's switch, each line showing what
// the other saved with the same "on restart" mark; choosing On from off asks
// for consent, Cancel and Exit leaving it off; choosing Off saves at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, highlightedEntry, markedEntries, press, chooseEntry, squeezed, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const CATEGORY = "Launching and playing a table";
const fake = createFakePinballYHost({ now: new Date(2026, 10, 3, 20, 0, 0) });

function choose(line) {
    chooseEntry(fake, line);
    fake.advanceTime(OPEN_OVER_MS);
}

// From the Offline Mode group to the Add-on's category, and back.
function goToCategory() {
    choose("Back");
    choose(CATEGORY);
}

function goToGroup() {
    choose("Back");
    choose("Offline Mode");
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
    choose("Offline Mode");
});

test("the line comes after the group's others, showing the saved Add-on value", () => {
    assert.deepEqual(drawnMenuLines(fake), ["[OFFLINE MODE]", "Pack update check: On", "Offer vpxtool: On", "Discord Rich Presence: Off", "---", "Back"]);
});

test("its page lists On and Off, the saved one marked", () => {
    choose("Discord Rich Presence: Off");

    assert.deepEqual(drawnMenuLines(fake), ["On", "Off", "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["Off"]);
});

test("choosing On shows the consent Dialog, the cursor on Cancel, nothing saved yet", () => {
    choose("On");

    const { title, message } = readDrawnMenu(fake);
    assert.equal(title, "Discord Rich Presence");
    assert.equal(squeezed(message), squeezed("Your Discord account open on this PC will publicly show the table being played, for how long, and when the wheel is open. No Profile name nor any other personal data from this PC is sent by the PinballY Expansion Pack."));
    assert.deepEqual(drawnMenuLines(fake), ["Turn on", "Cancel"]);
    assert.equal(highlightedEntry(fake), "Cancel");
    assert.equal(fake.readFile(ENV_LOCAL), undefined);
});

test("Cancel leaves it off, back on its page", () => {
    choose("Cancel");

    assert.deepEqual(markedEntries(fake, "radio"), ["Off"]);
    assert.equal(fake.readFile(ENV_LOCAL), undefined);
});

test("Exit leaves it off too, back on its page", () => {
    choose("On");
    assert.deepEqual(drawnMenuLines(fake), ["Turn on", "Cancel"], "the Dialog asks again");
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(markedEntries(fake, "radio"), ["Off"]);
    assert.equal(fake.readFile(ENV_LOCAL), undefined);
});

test("Turn on saves the Add-on's own key, marked on restart on both lines", () => {
    choose("On");
    choose("Turn on");

    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_DISCORD_RICH_PRESENCE=true\r\n");
    assert.equal(highlightedEntry(fake), "Discord Rich Presence: On (on restart)");
    assert.equal(config.addOns.discordRichPresence, false, "the running setting stays until PinballY restarts");

    goToCategory();
    assert.ok(drawnMenuLines(fake).includes("Discord Rich Presence: On (on restart)"));
});

test("turning it off on the Add-on's page turns the group's line off", () => {
    choose("Discord Rich Presence: On (on restart)");
    press(fake, "Select");
    choose("Save");
    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_DISCORD_RICH_PRESENCE=false\r\n");

    goToGroup();
    assert.ok(drawnMenuLines(fake).includes("Discord Rich Presence: Off"));
});

test("turned on on the Add-on's page, the group's line shows it, On keeping it without a Dialog", () => {
    goToCategory();
    choose("Discord Rich Presence: Off");
    press(fake, "Select");
    choose("Save");
    choose("Turn on");
    goToGroup();

    choose("Discord Rich Presence: On (on restart)");
    choose("On");
    assert.equal(highlightedEntry(fake), "Discord Rich Presence: On (on restart)");
    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_DISCORD_RICH_PRESENCE=true\r\n");
});

test("choosing Off saves at once, without a Dialog, on both lines", () => {
    choose("Discord Rich Presence: On (on restart)");
    choose("Off");

    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_DISCORD_RICH_PRESENCE=false\r\n");
    assert.equal(highlightedEntry(fake), "Discord Rich Presence: Off");

    goToCategory();
    assert.ok(drawnMenuLines(fake).includes("Discord Rich Presence: Off"));
    assertNoErrorLogged(fake);
});
