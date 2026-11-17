// ============================================================
// Import order check through main.js on the fake host: Scripts\main.js imports
// another script after the pack's line, so an Admin Profile is told once at
// startup to move the pack's line to the end; never again once shown.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startWithOwnerMain, titleAtALaterStart, shownDialog, answer, conflictLines, importOrderLines,
    PACK_LINE, IMPORT_ORDER_TITLE, IMPORT_ORDER_MESSAGE, UPDATE_STATE_FILE,
} from "./import_order_scenario.js";

const OWNER_MAIN = [PACK_LINE, "  import(\"./LaunchVideo.js\");"];

test("another import after the pack's line shows the Conflict Notice once, with one button", async () => {
    const start = await startWithOwnerMain(OWNER_MAIN);
    const { fake } = start;

    const dialog = shownDialog(fake);
    assert.equal(dialog.title, IMPORT_ORDER_TITLE);
    assert.equal(dialog.message, IMPORT_ORDER_MESSAGE);
    assert.deepEqual(dialog.lines, ["Got it"]);
    assert.equal(importOrderLines(fake).length, 1, "one Info Log line for the detection");
    assert.deepEqual(conflictLines(fake), [], "not a Conflict");

    await answer(start, "Got it");
    assert.equal(shownDialog(fake), null);
    assert.deepEqual(JSON.parse(fake.readFile(UPDATE_STATE_FILE)).conflictAnswers, { importOrder: "shown" }, "the pinned answer");
    assertNoErrorLogged(fake);

    assert.equal(titleAtALaterStart(OWNER_MAIN, fake.readFile(UPDATE_STATE_FILE)), null, "never again once shown");
});
