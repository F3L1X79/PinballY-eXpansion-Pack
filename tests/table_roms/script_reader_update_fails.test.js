// ============================================================
// A vpxtool update that fails, through main.js on the fake host: the result
// Dialog says the update failed and nothing changed, the old version stays
// remembered (offered again), and the cause goes to the Error Log.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import {
    startForScriptReader, answer, shownDialog, vpxtoolAnswering, rememberedVersionFile, SCRIPT_READER_STATE_FILE,
} from "./script_reader_prompt_scenario.js";

const INSTALL_OVER_MS = 4000;

test("a failed update says nothing has changed and keeps the old version remembered", async () => {
    const start = await startForScriptReader({
        adminProfiles: ["Alice"], vpxtool: vpxtoolAnswering({ output: "vpxtool git:v0.37.1\n" }), rememberedVersion: "0.37.1",
    });
    const { fake } = start;
    fake.answerNextScriptReaderInstall({ exitCode: 1, output: "vpxtool.exe is locked" });

    await answer(start, "Update");
    fake.advanceTime(INSTALL_OVER_MS);
    await start.settle();
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(shownDialog(fake), {
        title: "Update not possible",
        message: "vpxtool could not be updated; nothing has changed. You can try again from the eXpansion Pack Settings.",
        lines: ["OK"],
    });
    chooseEntry(fake, "OK");
    await start.settle();

    assert.equal(fake.readFile(SCRIPT_READER_STATE_FILE), rememberedVersionFile("0.37.1"));
    assert.deepEqual(errorLines(fake), [
        "[ScriptReaderInstall] ERROR vpxtool v0.38.0 not installed: helper exit code 1: vpxtool.exe is locked; see %TEMP%\\PinballYExpansionPack\\script-reader-install.log",
    ]);
});
