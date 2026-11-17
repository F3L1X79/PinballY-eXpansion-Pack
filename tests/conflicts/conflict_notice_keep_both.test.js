// ============================================================
// Conflict Notice through main.js on the fake host: an External Add-on cancels
// the launch screen before the pack, the Launch overlay still shows its Loader,
// and back on the wheel an Admin Profile is told, once: "Keep both" ends it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, answer, shownDialog, conflictLines, NOTICE_TITLE, NOTICE_MESSAGE, TURN_OFF } from "./conflict_notice_scenario.js";

test("an Admin Profile sees the Conflict Notice back on the wheel, and \"Keep both\" never shows it again", async () => {
    const start = await startOnWheelWithLaunchScript();
    const { fake } = start;
    assert.equal(shownDialog(fake), null, "nothing before a launch");
    assert.deepEqual(conflictLines(fake), []);

    const { loaderShown, dialog } = await playATable(start);

    assert.equal(loaderShown, true, "the Launch overlay behaves as before");
    assert.equal(dialog.title, NOTICE_TITLE);
    assert.equal(dialog.message, NOTICE_MESSAGE);
    assert.deepEqual(dialog.lines, [TURN_OFF, "Keep both"]);
    assert.equal(conflictLines(fake).length, 1, "one Info Log line for the detection");

    await answer(start, "Keep both");
    assert.equal(shownDialog(fake), null);

    const again = await playATable(start);
    assert.equal(again.loaderShown, true);
    assert.equal(again.dialog, null, "answered: never again");
    assert.equal(conflictLines(fake).length, 2, "each detection is still written");
    assertNoErrorLogged(fake);
});
