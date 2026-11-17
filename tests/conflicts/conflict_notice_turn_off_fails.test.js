// ============================================================
// Conflict Notice through main.js on the fake host: "Turn off Launch overlay"
// with a .env.local that cannot be written shows "Setting not saved",
// remembers nothing, and the Notice comes back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { ENV_LOCAL } from "../table_roms/script_reader_prompt_scenario.js";
import { startOnWheelWithLaunchScript, playATable, answer, shownDialog, NOTICE_TITLE, TURN_OFF, UPDATE_STATE_FILE } from "./conflict_notice_scenario.js";

test("a failed save shows \"Setting not saved\", remembers nothing, and the Notice shows again", async () => {
    const start = await startOnWheelWithLaunchScript({ seed: f => f.addFile(ENV_LOCAL, "ADD_ON_SEAMLESS_LAUNCH_OVERLAY=true\r\n") });
    const { fake } = start;
    fake.lockFile(ENV_LOCAL);

    await playATable(start);
    await answer(start, TURN_OFF);

    assert.equal(shownDialog(fake).message, "Setting not saved");
    assert.deepEqual(shownDialog(fake).lines, ["OK"]);
    assert.equal(fake.readFile(ENV_LOCAL), "ADD_ON_SEAMLESS_LAUNCH_OVERLAY=true\r\n");
    assert.equal(fake.readFile(UPDATE_STATE_FILE) ?? null, null, "nothing remembered");
    assert.equal(errorLines(fake).length, 1);

    await answer(start, "OK");
    start.fake.advanceTime(1000);
    assert.equal(shownDialog(fake).title, NOTICE_TITLE, "the Notice comes back");
    assert.equal(fake.readFile(UPDATE_STATE_FILE) ?? null, null, "still nothing remembered");
});
