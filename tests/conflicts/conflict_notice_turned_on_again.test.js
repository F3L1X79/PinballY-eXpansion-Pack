// ============================================================
// Conflict Notice through main.js on the fake host: once "Turn off Launch
// overlay" was answered, turning the Add-on on again in the settings never
// brings the Notice back, though each detection is still written.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, answerInAnEarlierStart, conflictLines, NOTICE_TITLE, TURN_OFF, UPDATE_STATE_FILE } from "./conflict_notice_scenario.js";

test("after \"Turn off\", the Launch overlay turned on again shows no Notice for the same Conflict", async () => {
    const earlier = answerInAnEarlierStart(TURN_OFF);
    assert.equal(earlier.title, NOTICE_TITLE);
    assert.deepEqual(JSON.parse(earlier.stateFile).conflictAnswers, { launchScreen: "turnOff" });

    const start = await startOnWheelWithLaunchScript({ seed: f => f.addFile(UPDATE_STATE_FILE, earlier.stateFile) });
    const { loaderShown, dialog } = await playATable(start);

    assert.equal(loaderShown, true, "the Launch overlay is on again");
    assert.equal(dialog, null);
    assert.equal(conflictLines(start.fake).length, 1);
    assertNoErrorLogged(start.fake);
});
