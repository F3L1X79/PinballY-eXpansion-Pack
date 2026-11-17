// ============================================================
// Conflict Notice through main.js on the fake host: the Scripts folder cannot
// be read when the Notice is prepared, so the failure is logged and the Notice
// shows without naming any script.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, NOTICE_TITLE, NOTICE_MESSAGE, SCRIPTS_FOLDER } from "./conflict_notice_scenario.js";

test("an unreadable Scripts folder is logged and the Conflict Notice shows without the probable script", async () => {
    const start = await startOnWheelWithLaunchScript({
        seed: f => f.addFile(`${SCRIPTS_FOLDER}\\LaunchVideo.js`, "// launch video"),
    });
    start.fake.failNextFolderListing();

    const { dialog } = await playATable(start);

    assert.equal(dialog.title, NOTICE_TITLE);
    assert.equal(dialog.message, NOTICE_MESSAGE);
    const errors = errorLines(start.fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /\[ConflictNotice\] ERROR reading .*\\Scripts,/);
});
