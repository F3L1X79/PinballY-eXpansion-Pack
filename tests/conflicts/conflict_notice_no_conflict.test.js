// ============================================================
// Conflict Notice through main.js on the fake host, with no script cancelling
// the launch screen before the pack: no false alarm, neither a Notice nor an
// Info Log line, and the Launch overlay draws as usual.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, conflictLines } from "./conflict_notice_scenario.js";

test("no earlier listener cancelling the launch screen: no Conflict Notice, no Info Log line", async () => {
    const start = await startOnWheelWithLaunchScript({ externalAddOn: false });

    const { loaderShown, dialog } = await playATable(start);

    assert.equal(loaderShown, true);
    assert.equal(dialog, null);
    assert.deepEqual(conflictLines(start.fake), []);
    assertNoErrorLogged(start.fake);
});
