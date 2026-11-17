// ============================================================
// Conflict Notice through main.js on the fake host, with an update state file
// cut by a crash: logged, read as nothing answered, so the Notice shows again,
// and the start goes on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, NOTICE_TITLE, UPDATE_STATE_FILE } from "./conflict_notice_scenario.js";

test("an unreadable remembered answer is logged and the Conflict Notice shows again", async () => {
    const cut = "{\"conflictAnswers\":{\"launchScreen\":\"keep";
    const start = await startOnWheelWithLaunchScript({ seed: f => f.addFile(UPDATE_STATE_FILE, cut) });

    const { loaderShown, dialog } = await playATable(start);

    assert.equal(loaderShown, true, "the start went on");
    assert.equal(dialog.title, NOTICE_TITLE);
    const errors = errorLines(start.fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /ERROR reading pack_update\.json, deleted/);
});
