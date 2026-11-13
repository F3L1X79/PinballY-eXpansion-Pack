// ============================================================
// "Install vpxtool" failing through main.js: the helper answers an exit code
// other than 0 (a wrong digest); the Loader goes, the failure result Dialog
// says nothing has changed, the cause is in the Error Log, no table script
// is read, and the line stays in the Settings for another try.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { readDrawnMenu, drawnMenuLines, chooseEntry, squeezed, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { startOnSettings, openSettings, openDialog, romnameRuns, errorsAfterStart, VPXTOOL } from "./install_vpxtool_scenario.js";

const ERROR_LOG = "C:\\PinballY\\Scripts\\ExpansionPack\\logs\\errors.log";
const FAILED = "vpxtool could not be installed; nothing has changed. You can try again from the eXpansion Pack Settings.";

let fake;

test("setup", async () => {
    ({ fake } = await startOnSettings());
    fake.answerNextScriptReaderInstall({ exitCode: 1, output: "SHA-256 0000 is not the expected ea0b\r\n", durationMs: 2000 });
    openDialog(fake);
    chooseEntry(fake, "Install");
    await settle();
});

test("the failure result Dialog shows once the helper answers", async () => {
    fake.advanceTime(2500);
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(readLoader(fake).shown, false);
    const result = readDrawnMenu(fake);
    assert.equal(result.title, "Install not possible");
    assert.equal(squeezed(result.message), squeezed(FAILED));
    assert.equal(fake.files.fileExists(VPXTOOL), false);
});

test("the cause is in the Error Log, pointing to the helper's log", () => {
    assert.deepEqual(errorsAfterStart(fake), [
        "[ScriptReaderInstall] ERROR vpxtool v0.38.0 not installed: helper exit code 1: SHA-256 0000 is not the expected ea0b; see %TEMP%\\PinballYExpansionPack\\script-reader-install.log",
    ]);
    assert.match(fake.readFile(ERROR_LOG), /\[ScriptReaderInstall\] ERROR vpxtool v0\.38\.0 not installed/);
});

test("OK leaves the wheel, no script read, and the line still there", () => {
    chooseEntry(fake, "OK");
    fake.advanceTime(20000);
    assert.deepEqual(romnameRuns(fake), []);

    openSettings(fake);
    assert.equal(drawnMenuLines(fake).includes("Install vpxtool v0.38.0"), true);
});
