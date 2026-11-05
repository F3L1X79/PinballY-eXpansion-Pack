// ============================================================
// "Update now" that cannot start, with a PinballY Version gap, through main.js on
// the fake host: PinballY stays open and the gap remains, so the PinballY Version
// Notice opens after the failure's message, before the Startup Screen.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { answer, shownDialog } from "../table_roms/script_reader_prompt_scenario.js";
import { startOnUpdatePrompt } from "./version_notice_scenario.js";

const HELPER_STILL_AWAITED_MS = 1000;
// The helper never gets ready: the failure comes when the host stops waiting.
const HELPER_TIMEOUT_MS = 120000;

test("the Notice opens once the failure's message closes", async () => {
    const start = await startOnUpdatePrompt({ seed: f => f.failNextPackUpdate() });
    const { fake, settle } = start;

    await answer(start, "Update now");
    fake.advanceTime(HELPER_STILL_AWAITED_MS);
    assert.equal(shownDialog(fake), null, "the wait holds the queue");

    fake.advanceTime(HELPER_TIMEOUT_MS - HELPER_STILL_AWAITED_MS);
    await settle();
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(shownDialog(fake).title, "Update not possible");

    await answer(start, "OK");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(shownDialog(fake).title, "Untested PinballY version");
    assert.equal(errorLines(fake).length, 1, "only the Pack Update's own failure");
    assert.match(errorLines(fake)[0], /^\[PackUpdate\] ERROR/);
});
