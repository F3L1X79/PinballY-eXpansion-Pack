// ============================================================
// Import order check through main.js on the fake host: a cabinet that kept
// the pack's earlier import line, with another import after it, is still told
// to move the pack's line to the end.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startWithOwnerMain, shownDialog, importOrderLines, notCheckedLines, OLD_PACK_LINE, IMPORT_ORDER_TITLE } from "./import_order_scenario.js";

test("the earlier pack line is found, and a later import after it shows the Conflict Notice", async () => {
    const { fake } = await startWithOwnerMain([OLD_PACK_LINE, "import(\"./LaunchVideo.js\");"]);

    assert.equal(shownDialog(fake).title, IMPORT_ORDER_TITLE);
    assert.equal(importOrderLines(fake).length, 1);
    assert.deepEqual(notCheckedLines(fake), []);
    assertNoErrorLogged(fake);
});
