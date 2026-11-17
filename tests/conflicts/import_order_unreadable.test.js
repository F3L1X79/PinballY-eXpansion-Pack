// ============================================================
// Import order check through main.js on the fake host: without a readable
// Scripts\main.js, one Info Log line says so, nothing shows, startup goes on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startWithOwnerMain, shownDialog, importOrderLines, notCheckedLines } from "./import_order_scenario.js";

test("an unreadable Scripts\\main.js is written to the Info Log, and nothing shows", async () => {
    const { fake } = await startWithOwnerMain(null);

    assert.equal(shownDialog(fake), null);
    assert.deepEqual(importOrderLines(fake), []);
    assert.equal(notCheckedLines(fake).length, 1);
    assert.match(notCheckedLines(fake)[0], /Scripts\\main\.js unreadable/);
    assertNoErrorLogged(fake);
});
