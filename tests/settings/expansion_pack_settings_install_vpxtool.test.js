// ============================================================
// "Install vpxtool v0.38.0" in the eXpansion Pack Settings, through main.js,
// vpxtool missing with Table ROMs on: the line opens the Script Reader
// Dialog; Install shows the captioned Loader, blocks the buttons and asks
// the helper for the Script Reader Version; once it answers, the result
// Dialog shows, the table scripts are read at once, and the line is gone.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { readDrawnMenu, drawnMenuLines, isDrawnMenuShown, press, chooseEntry, squeezed, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { readLoader, readLoaderCaption } from "../support/loader_reader.js";
import {
    startOnSettings, openSettings, openDialog, romnameRuns, assertNoOtherErrorLogged, DIALOG, SCRIPT_READER, VPXTOOL,
} from "./install_vpxtool_scenario.js";

// The made-up time the fake helper takes, and the pack's poll on top.
const INSTALL_MS = 3000;
const POLL_MS = 500;

let fake;

test("setup", async () => {
    ({ fake } = await startOnSettings());
});

test("the line shows before Back while vpxtool is missing", () => {
    assert.deepEqual(drawnMenuLines(fake).slice(-5), ["Offline Mode", "---", "Install vpxtool v0.38.0", "---", "Back"]);
});

test("it opens the Script Reader Prompt: what vpxtool is for, its author, licence and site", () => {
    openDialog(fake);

    const dialog = readDrawnMenu(fake);
    assert.equal(dialog.title, DIALOG.title);
    assert.equal(squeezed(dialog.message), squeezed(DIALOG.message));
    assert.deepEqual(drawnMenuLines(fake), DIALOG.lines);
});

test("Install closes it and shows the Loader with its caption over the wheel, the buttons blocked", async () => {
    chooseEntry(fake, "Install");
    await settle();

    assert.equal(isDrawnMenuShown(fake), false);
    assert.deepEqual(fake.scriptReaderInstallsAsked(), [SCRIPT_READER]);
    assert.equal(readLoader(fake).shown, true);
    assert.equal(readLoaderCaption(fake).text, "Downloading…");
    assert.equal(press(fake, "Select").defaultPrevented, true, "no button reaches the wheel meanwhile");
    assert.deepEqual(romnameRuns(fake), [], "nothing read before the install");
    assert.deepEqual(fake.executedCommands().filter(id => id === fake.getBuiltInCommand("Quit")), [], "PinballY stays");
});

test("once installed, the result Dialog shows and the table script is read at once", async () => {
    fake.advanceTime(INSTALL_MS + POLL_MS);
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(readLoader(fake).shown, false);
    const result = readDrawnMenu(fake);
    assert.equal(result.title, "vpxtool installed");
    assert.equal(squeezed(result.message), squeezed("vpxtool v0.38.0 is installed: each table's ROM now fills in by itself."));
    assert.deepEqual(drawnMenuLines(fake), ["OK"]);
    assert.equal(fake.files.fileExists(VPXTOOL), true);

    chooseEntry(fake, "OK");
    fake.advanceTime(1000);
    assert.equal(romnameRuns(fake).length, 1, "well before the Add-on's 10 s startup delay");
});

test("the line is gone once vpxtool is installed", () => {
    openSettings(fake);

    assert.equal(drawnMenuLines(fake).includes("Install vpxtool v0.38.0"), false);
    assertNoOtherErrorLogged(fake);
});
