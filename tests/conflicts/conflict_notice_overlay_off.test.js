// ============================================================
// Conflict Notice through main.js on the fake host, with the Launch overlay
// Add-on off: an External Add-on cancelling the launch screen takes nothing
// from the pack, so no Conflict Notice.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, conflictLines } from "./conflict_notice_scenario.js";

test("Launch overlay off: no Conflict Notice for a script that cancels the launch screen", async () => {
    const start = await startOnWheelWithLaunchScript({ launchOverlay: false });

    const { dialog } = await playATable(start);

    assert.equal(dialog, null);
    assert.deepEqual(conflictLines(start.fake), []);
    assertNoErrorLogged(start.fake);
});
