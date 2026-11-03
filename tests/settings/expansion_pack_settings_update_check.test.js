// ============================================================
// The Offline Mode group of the eXpansion Pack Settings, through main.js:
// a submenu after the language line holding the Pack update check line,
// whose page lists On and Off, the saved one marked; choosing saves
// UPDATE_CHECK at once, shown "on restart", back on its line in the group;
// a failed write says "Setting not saved". No "Update to" entry here.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, highlightedEntry, markedEntries, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { errorLines } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const fake = createFakePinballYHost({ now: new Date(2026, 9, 27, 20, 0, 0) });

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("Offline Mode comes after the language line as a submenu, with no Update entry when no release is known", () => {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake).slice(5), ["---", "Startup screen: Profile picker", "Language: English", "Offline Mode", "---", "Back"]);
    assert.ok(markedEntries(fake, "submenu").includes("Offline Mode"));
});

test("the group lists its three switches under its heading, the cursor on the first", () => {
    chooseEntry(fake, "Offline Mode");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake), ["[OFFLINE MODE]", "Pack update check: On", "Offer vpxtool: On", "Discord Rich Presence: Off", "---", "Back"]);
    assert.equal(highlightedEntry(fake), "Pack update check: On");
});

test("its page lists On and Off, the saved one marked, then Cancel", () => {
    chooseEntry(fake, "Pack update check: On");
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(drawnMenuLines(fake), ["On", "Off", "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["On"]);
    assert.equal(highlightedEntry(fake), "On");
});

test("choosing Off saves UPDATE_CHECK at once, shown on restart on its line in the group", () => {
    chooseEntry(fake, "Off");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(fake.readFile(ENV_LOCAL), "UPDATE_CHECK=false\r\n");
    assert.ok(fake.logLines().includes("[ExpansionPackSettings] Saved UPDATE_CHECK=false in .env.local."));
    assert.deepEqual(drawnMenuLines(fake), ["[OFFLINE MODE]", "Pack update check: Off (on restart)", "Offer vpxtool: On", "Discord Rich Presence: Off", "---", "Back"]);
    assert.equal(highlightedEntry(fake), "Pack update check: Off (on restart)");
    assert.equal(config.updateCheck, true, "the running setting stays until PinballY restarts");
    assert.deepEqual(errorLines(fake), []);
});

test("a write that fails says \"Setting not saved\", then the page on the value saved before", () => {
    fake.lockFile(ENV_LOCAL);
    chooseEntry(fake, "Pack update check: Off (on restart)");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "On");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(readDrawnMenu(fake).message, "Setting not saved");
    chooseEntry(fake, "OK");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(markedEntries(fake, "radio"), ["Off"]);
    assert.equal(fake.readFile(ENV_LOCAL), "UPDATE_CHECK=false\r\n");
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /^\[ExpansionPackSettings\] .*Permission denied/);
});
