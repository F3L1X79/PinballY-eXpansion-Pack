// ============================================================
// Conflict Notice through main.js on the fake host: Exit counts as "Keep both",
// remembered in the update state file, so the next start on the same files
// still writes the detection but never shows the Notice again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, answerInAnEarlierStart, conflictLines, NOTICE_TITLE, UPDATE_STATE_FILE } from "./conflict_notice_scenario.js";

test("a Conflict Notice left with Exit never shows again, even after a restart", async () => {
    const earlier = answerInAnEarlierStart("Exit");
    assert.equal(earlier.title, NOTICE_TITLE, "the earlier start showed it");
    assert.notEqual(earlier.stateFile, null, "and remembered the answer");

    const start = await startOnWheelWithLaunchScript({ seed: f => f.addFile(UPDATE_STATE_FILE, earlier.stateFile) });
    const { loaderShown, dialog } = await playATable(start);

    assert.equal(loaderShown, true);
    assert.equal(dialog, null, "answered in the earlier start");
    assert.equal(conflictLines(start.fake).length, 1, "the detection is still written");
    assertNoErrorLogged(start.fake);
});
