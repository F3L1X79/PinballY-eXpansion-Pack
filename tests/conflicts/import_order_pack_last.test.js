// ============================================================
// Import order check through main.js on the fake host: the pack's line is
// the last import of Scripts\main.js, after the owner's own, so nothing shows.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startWithOwnerMain, shownDialog, importOrderLines, notCheckedLines, PACK_LINE } from "./import_order_scenario.js";

test("the pack's line last raises no Conflict Notice", async () => {
    const { fake } = await startWithOwnerMain(["import(\"./LaunchVideo.js\");", PACK_LINE, ""]);

    assert.equal(shownDialog(fake), null);
    assert.deepEqual(importOrderLines(fake), []);
    assert.deepEqual(notCheckedLines(fake), []);
    assertNoErrorLogged(fake);
});
