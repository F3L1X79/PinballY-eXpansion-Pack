// ============================================================
// Conflict Notice through main.js on the fake host: "Turn off Launch overlay"
// saves the Add-on off in .env.local the way the eXpansion Pack Settings do,
// then asks "Restart now / Later"; Later leaves the wheel as it was.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { highlightedEntry } from "../drawn_menu/drawn_menu_reader.js";
import { ENV_LOCAL } from "../table_roms/script_reader_prompt_scenario.js";
import { startOnWheelWithLaunchScript, playATable, answer, shownDialog, NOTICE_TITLE, TURN_OFF } from "./conflict_notice_scenario.js";

test("\"Turn off Launch overlay\" saves the Add-on off, then Later leaves the wheel as it was", async () => {
    const start = await startOnWheelWithLaunchScript();
    const { fake } = start;

    const { dialog } = await playATable(start);
    assert.equal(dialog.title, NOTICE_TITLE);
    assert.deepEqual(dialog.lines, [TURN_OFF, "Keep both"]);
    assert.equal(highlightedEntry(fake), "Keep both", "the cursor stays on Keep both");

    await answer(start, TURN_OFF);
    assert.match(fake.readFile(ENV_LOCAL), /^ADD_ON_SEAMLESS_LAUNCH_OVERLAY=false\r?$/m);
    assert.deepEqual(shownDialog(fake).lines, ["Restart now", "Later"]);

    await answer(start, "Later");
    assert.equal(shownDialog(fake), null, "back on the wheel");
    assert.equal(fake.restartsAsked(), 0);

    const again = await playATable(start);
    assert.equal(again.dialog, null, "answered: never again this session");
    assertNoErrorLogged(fake);
});
