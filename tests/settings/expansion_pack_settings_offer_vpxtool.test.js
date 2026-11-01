// ============================================================
// The Offer vpxtool line of the Offline Mode group, through main.js: its
// page's Cancel comes back on its line; choosing Off saves OFFER_VPXTOOL at
// once, shown "on restart"; Back and Exit on the group return to the list on
// the group's line, and leaving the list then asks to restart.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, highlightedEntry, markedEntries, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const fake = createFakePinballYHost({ now: new Date(2026, 9, 30, 20, 0, 0) });

function openGroup() {
    chooseEntry(fake, "Offline Mode");
    fake.advanceTime(OPEN_OVER_MS);
}

test("setup", async () => {
    fake.addFile(ENV_LOCAL, "LANGUAGE=en\r\n");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
});

test("the page's Cancel comes back on the Offer vpxtool line", () => {
    openGroup();
    chooseEntry(fake, "Offer vpxtool: On");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(drawnMenuLines(fake), ["On", "Off", "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["On"]);

    chooseEntry(fake, "Cancel");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Offer vpxtool: On");
});

test("choosing Off saves OFFER_VPXTOOL at once, shown on restart on its line", () => {
    chooseEntry(fake, "Offer vpxtool: On");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Off");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(fake.readFile(ENV_LOCAL), "LANGUAGE=en\r\nOFFER_VPXTOOL=false\r\n");
    assert.ok(fake.logLines().includes("[ExpansionPackSettings] Saved OFFER_VPXTOOL=false in .env.local."));
    assert.deepEqual(drawnMenuLines(fake), ["[OFFLINE MODE]", "Pack update check: On", "Offer vpxtool: Off (on restart)", "---", "Back"]);
    assert.equal(highlightedEntry(fake), "Offer vpxtool: Off (on restart)");
    assert.equal(config.offerVpxtool, true, "the running setting stays until PinballY restarts");
});

test("Back and Exit on the group return to the list on the group's line", () => {
    chooseEntry(fake, "Back");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Offline Mode");

    openGroup();
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Offline Mode");
});

test("leaving the list with Offer vpxtool changed asks to restart", () => {
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(readDrawnMenu(fake).message, "The saved settings apply when PinballY restarts.");
    chooseEntry(fake, "Later");
    assertNoErrorLogged(fake);
});
