// ============================================================
// Conflict Notice through main.js on the fake host, with Bob, not an Admin
// Profile, on the wheel: the Conflict is written but not shown, until a
// switch to Alice, an Admin Profile, in the same session.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, playATable, shownDialog, conflictLines, NOTICE_TITLE } from "./conflict_notice_scenario.js";

test("a Profile that is not an Admin doesn't see the Conflict Notice; switching to an Admin Profile shows it", async () => {
    const start = await startOnWheelWithLaunchScript({ adminProfiles: ["Alice"], activeProfile: "Bob" });
    const { fake, store, settle } = start;

    const { loaderShown, dialog } = await playATable(start);
    assert.equal(loaderShown, true);
    assert.equal(dialog, null, "Bob doesn't see the Setup Entries");
    assert.equal(conflictLines(fake).length, 1, "the detection is written all the same");

    store.switchTo("Alice");
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(shownDialog(fake).title, NOTICE_TITLE);
    assertNoErrorLogged(fake);
});
