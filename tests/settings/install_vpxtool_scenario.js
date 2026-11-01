// ============================================================
// The "Install vpxtool" line's start: main.js on the fake host with Drawn
// Menus and Table ROMs on (or off), vpxtool missing (or as the test says),
// one VPX table to read and the Script Reader install helper in tools\;
// then, past any Script Reader Prompt's Exit, the eXpansion Pack Settings opened from the Operator
// Menu. Never loaded by PinballY.
// ============================================================

import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, chooseEntry, press, isDrawnMenuShown, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { errorLines } from "../support/error_log.js";

export const VPXTOOL = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\vpxtool.exe";
const SCRIPT_READER_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\script_reader_install.ps1";
const SCRIPT_READER_STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\script_reader.json";
export const TABLE_FILE = "C:\\Visual Pinball\\Tables\\Medieval Madness (Williams 1997).vpx";
export const SCRIPT_READER = {
    zipUrl: "https://github.com/francisdb/vpxtool/releases/download/v0.38.0/vpxtool-windows-x86_64-v0.38.0.zip",
    sha256: "ea0b1da9408f6ee40d30f505c0aaaf5ac14c286076103d378d469c37c0d2b17d",
    version: "0.38.0",
};
export const DIALOG = {
    title: "vpxtool v0.38.0",
    message: "vpxtool reads each table's script so that its ROM fills in by itself. Written by Francis De Brabandere, under the Apache-2.0 licence, downloaded from github.com/francisdb/vpxtool. You can also install it later from the eXpansion Pack Settings, or by hand.",
    lines: ["Install", "No thanks"],
};
// What the Table ROMs Add-on logs at init without vpxtool: not this scenario's doing.
const MISSING_AT_START = `[TableRoms] ERROR vpxtool not found at ${VPXTOOL}; the table scripts are not read.`;

// The errors logged besides the missing vpxtool at start.
export const errorsAfterStart = fake => errorLines(fake).filter(line => line !== MISSING_AT_START);

export function assertNoOtherErrorLogged(fake) {
    assert.deepEqual(errorsAfterStart(fake), []);
}

// The vpxtool runs on the table so far.
export const romnameRuns = fake => fake.programRuns().filter(run => run.program === VPXTOOL && run.args[0] === "romname");

export function openSettings(fake) {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
}

// From the list, the install line's Dialog.
export function openDialog(fake) {
    chooseEntry(fake, "Install vpxtool v0.38.0");
    fake.advanceTime(OPEN_OVER_MS);
}

// tableRoms: whether the Add-on runs; vpxtool: whether it is already
// installed, at the Script Reader Version, or its run (args => answer);
// rememberedVersion: the state file's, none when null. Returns the fake
// host, the Settings list on screen.
export async function startOnSettings({ tableRoms = true, vpxtool = false, rememberedVersion = null } = {}) {
    const fake = createFakePinballYHost({
        now: new Date(2026, 9, 30, 20, 0, 0),
        tables: [{ id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false, gameFile: TABLE_FILE }],
    });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    fake.addFile(SCRIPT_READER_HELPER, "helper");
    fake.addFile(TABLE_FILE, "script");
    if (typeof vpxtool === "function") fake.addProgram(VPXTOOL, vpxtool);
    else if (vpxtool) fake.addProgram(VPXTOOL, args => ({ output: args[0] === "--version" ? "vpxtool git:v0.38.0\n" : "" }));
    if (rememberedVersion !== null) fake.addFile(SCRIPT_READER_STATE_FILE, JSON.stringify({ vpxtoolVersion: rememberedVersion, version: 1 }));
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus" || (tableRoms && key === "tableRoms");
    config.language = "en";
    await import("../../main.js");
    await settle();
    fake.advanceTime(OPEN_OVER_MS);
    if (isDrawnMenuShown(fake)) {
        // The Script Reader Prompt at startup, left for a later start.
        press(fake, "Exit");
        await settle();
    }
    openSettings(fake);
    return { fake, lines: drawnMenuLines(fake) };
}
