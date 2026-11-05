// ============================================================
// "Update now" with a PinballY Version gap, through main.js on the fake host:
// the Pack Update's blocking wait holds the queue, so the PinballY Version
// Notice neither opens nor is marked before PinballY quits.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { answer, shownDialog } from "../table_roms/script_reader_prompt_scenario.js";
import { startOnUpdatePrompt, RELEASE } from "./version_notice_scenario.js";

// Past the helper's readiness, when PinballY quits.
const QUIT_MS = 5000;

test("the Notice does not open during the Pack Update's wait, and stays unmarked", async () => {
    const start = await startOnUpdatePrompt();
    const { fake } = start;

    await answer(start, "Update now");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(fake.packUpdatesAsked(), [RELEASE]);
    assert.equal(shownDialog(fake), null, "the wait holds the queue");

    fake.advanceTime(QUIT_MS);
    assert.deepEqual(fake.executedCommands().filter(id => id === fake.getBuiltInCommand("Quit")), [fake.getBuiltInCommand("Quit")]);
    assert.equal(shownDialog(fake), null);
    assert.deepEqual(fake.logLines().filter(line => line.includes("[VersionNotice]")), [], "not marked as shown");
    assertNoErrorLogged(fake);
});
