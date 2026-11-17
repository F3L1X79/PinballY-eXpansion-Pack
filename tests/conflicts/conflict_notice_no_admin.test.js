// ============================================================
// Conflict Notice through main.js on the fake host, on a cabinet without any
// Admin Profile: everyone sees the Setup Entries, so the Notice shows.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, NOTICE_TITLE } from "./conflict_notice_scenario.js";

test("without any Admin Profile, the active Profile sees the Conflict Notice", async () => {
    const start = await startOnWheelWithLaunchScript({ adminProfiles: [], activeProfile: "Bob" });

    const { dialog } = await playATable(start);

    assert.equal(dialog.title, NOTICE_TITLE);
    assertNoErrorLogged(start.fake);
});
