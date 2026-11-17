// ============================================================
// Conflict Notice through main.js on the fake host: with RichardL64's
// LaunchVideo.js in Scripts, the Notice names it as the probable script; the
// pack's own seamless_launch_overlay.js, in its folder, is never named.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, NOTICE_MESSAGE, SCRIPTS_FOLDER, PACK_FOLDER } from "./conflict_notice_scenario.js";

test("the Conflict Notice names LaunchVideo.js found in Scripts, never the pack's own Launch overlay", async () => {
    const start = await startOnWheelWithLaunchScript({
        seed: f => {
            f.addFile(`${SCRIPTS_FOLDER}\\LaunchVideo.js`, "// launch video");
            f.addFile(`${PACK_FOLDER}\\addons\\seamless_launch_overlay.js`, "// the pack's");
        },
    });

    const { dialog } = await playATable(start);

    assert.equal(dialog.message, `${NOTICE_MESSAGE} Probably: LaunchVideo.js.`);
    assertNoErrorLogged(start.fake);
});
