// ============================================================
// Conflict Notice through main.js on the fake host: one sub-folder of Scripts
// cannot be read, so it is logged and skipped, and the Notice still names the
// known file found beside it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, NOTICE_MESSAGE, SCRIPTS_FOLDER } from "./conflict_notice_scenario.js";

test("an unreadable sub-folder of Scripts is logged and skipped, and the Notice names what was found elsewhere", async () => {
    const brokenFolder = `${SCRIPTS_FOLDER}\\Broken`;
    const start = await startOnWheelWithLaunchScript({
        seed: f => {
            f.addFile(`${SCRIPTS_FOLDER}\\LaunchVideo.js`, "// launch video");
            f.addFile(`${brokenFolder}\\LaunchFade.js`, "// fade");
        },
    });
    start.fake.failNextFolderListing(brokenFolder);

    const { dialog } = await playATable(start);

    assert.equal(dialog.message, `${NOTICE_MESSAGE} Probably: LaunchVideo.js.`);
    const errors = errorLines(start.fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /\[ConflictNotice\] ERROR reading .*\\Broken/);
});
