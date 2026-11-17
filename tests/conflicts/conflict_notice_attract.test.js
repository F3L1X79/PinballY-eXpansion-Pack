// ============================================================
// Conflict Notice through main.js on the fake host: attract mode closing the
// Notice is no answer, so nothing is remembered and the next detection
// shows it again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, shownDialog, NOTICE_TITLE, UPDATE_STATE_FILE } from "./conflict_notice_scenario.js";

test("attract mode closing the Conflict Notice doesn't answer it", async () => {
    const start = await startOnWheelWithLaunchScript();
    const { fake, settle } = start;
    assert.equal((await playATable(start)).dialog.title, NOTICE_TITLE);

    fake.enterAttractMode();
    await settle();
    assert.equal(shownDialog(fake), null, "attract mode closed it");
    fake.exitAttractMode();
    await settle();

    assert.equal(fake.readFile(UPDATE_STATE_FILE) ?? null, null, "nothing remembered");
    const again = await playATable(start);
    assert.equal(again.dialog.title, NOTICE_TITLE, "asked again");
    assertNoErrorLogged(fake);
});
