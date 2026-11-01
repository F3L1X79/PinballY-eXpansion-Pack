// ============================================================
// Script Reader Prompt for an older vpxtool, its version remembered at an
// earlier start (as at the first start of a Pack Update that raised the
// Script Reader Version), through main.js on the fake host: it says "update" with
// both versions; "Update" swaps vpxtool, remembers the new version at once,
// and the Settings line then reads up to date, greyed.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readDrawnMenu, drawnMenuLines, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { openSettings } from "../settings/install_vpxtool_scenario.js";
import {
    startForScriptReader, answer, shownDialog, vpxtoolAnswering, rememberedVersionFile, SCRIPT_READER_STATE_FILE,
} from "./script_reader_prompt_scenario.js";

const INSTALL_OVER_MS = 4000;

test("an older vpxtool remembered: the prompt offers the update, and the Settings line reads up to date after it", async () => {
    const start = await startForScriptReader({
        adminProfiles: ["Alice"], vpxtool: vpxtoolAnswering({ output: "vpxtool git:v0.37.1\n" }), rememberedVersion: "0.37.1",
    });
    const { fake } = start;

    assert.deepEqual(start.dialog, {
        title: "vpxtool v0.37.1 → v0.38.0",
        message: "vpxtool reads each table's script so that its ROM fills in by itself. Written by Francis De Brabandere, under the Apache-2.0 licence, downloaded from github.com/francisdb/vpxtool. You can also update it later from the eXpansion Pack Settings, or by hand.",
        lines: ["Update", "No thanks"],
    });

    await answer(start, "Update");
    fake.advanceTime(INSTALL_OVER_MS);
    await start.settle();
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(shownDialog(fake), { title: "vpxtool updated", message: "vpxtool is updated to v0.38.0.", lines: ["OK"] });
    assert.equal(fake.readFile(SCRIPT_READER_STATE_FILE), rememberedVersionFile("0.38.0"));
    chooseEntry(fake, "OK");
    await start.settle();

    openSettings(fake);
    const upToDate = readDrawnMenu(fake).rows.find(row => row.title === "Update vpxtool");
    assert.equal(upToDate.reason, "vpxtool v0.38.0 is up to date");
    assert.ok(!drawnMenuLines(fake).some(line => line.startsWith("Install vpxtool")));
    assertNoErrorLogged(fake);
});
