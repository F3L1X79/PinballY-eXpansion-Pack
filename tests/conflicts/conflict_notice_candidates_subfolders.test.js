// ============================================================
// Conflict Notice through main.js on the fake host: known launch-screen files
// in Scripts and in its sub-folders, whatever their case, are all named, an
// earlier standalone seamless_launch_overlay.js among them.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, NOTICE_MESSAGE, SCRIPTS_FOLDER } from "./conflict_notice_scenario.js";

test("the Conflict Notice names every known file of Scripts and its sub-folders, matched whatever the case", async () => {
    const start = await startOnWheelWithLaunchScript({
        seed: f => {
            f.addFile(`${SCRIPTS_FOLDER}\\RichardL64\\launchfade.JS`, "// fade");
            f.addFile(`${SCRIPTS_FOLDER}\\seamless_launch_overlay.js`, "// an earlier copy");
            f.addFile(`${SCRIPTS_FOLDER}\\Other\\Attract.js`, "// unrelated");
        },
    });

    const { dialog } = await playATable(start);

    assert.equal(dialog.message, `${NOTICE_MESSAGE} Probably: LaunchFade.js, seamless_launch_overlay.js.`);
    assertNoErrorLogged(start.fake);
});
