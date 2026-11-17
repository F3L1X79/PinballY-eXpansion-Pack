// ============================================================
// Conflict Notice through main.js on the fake host: LaunchVideo.js sits in
// Scripts but nothing cancels the launch screen before the pack, so no Notice:
// a file found only names a candidate, it never raises a Conflict.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, conflictLines, SCRIPTS_FOLDER } from "./conflict_notice_scenario.js";

test("a known launch-screen file with no Conflict seen raises no Conflict Notice", async () => {
    const start = await startOnWheelWithLaunchScript({
        externalAddOn: false,
        seed: f => f.addFile(`${SCRIPTS_FOLDER}\\LaunchVideo.js`, "// launch video"),
    });

    const { dialog } = await playATable(start);

    assert.equal(dialog, null);
    assert.deepEqual(conflictLines(start.fake), []);
    assertNoErrorLogged(start.fake);
});
