// ============================================================
// "Install vpxtool" that never answers, through main.js: the buttons stay
// blocked until 90 s, then the Loader goes, the failure result Dialog
// shows and the timeout is in the Error Log.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { readDrawnMenu, press, chooseEntry, squeezed, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { startOnSettings, openDialog, errorsAfterStart } from "./install_vpxtool_scenario.js";

const FAILED = "vpxtool could not be installed; nothing has changed. You can try again from the eXpansion Pack Settings.";

let fake;

test("setup", async () => {
    ({ fake } = await startOnSettings());
    fake.answerNextScriptReaderInstall({ hangs: true });
    openDialog(fake);
    chooseEntry(fake, "Install");
    await settle();
});

test("the Loader stays and the buttons are blocked until 90 s", () => {
    fake.advanceTime(89000);

    assert.equal(readLoader(fake).shown, true);
    assert.equal(press(fake, "Select").defaultPrevented, true);
    assert.deepEqual(errorsAfterStart(fake), []);
});

test("after 90 s the install counts as failed", async () => {
    fake.advanceTime(1500);
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(readLoader(fake).shown, false);
    const result = readDrawnMenu(fake);
    assert.equal(result.title, "Install not possible");
    assert.equal(squeezed(result.message), squeezed(FAILED));
    assert.deepEqual(errorsAfterStart(fake), [
        "[ScriptReaderInstall] ERROR vpxtool v0.38.0 not installed: no answer from the helper within 90 s; see %TEMP%\\PinballYExpansionPack\\script-reader-install.log",
    ]);
});
