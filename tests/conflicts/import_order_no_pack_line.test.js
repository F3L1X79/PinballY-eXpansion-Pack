// ============================================================
// Import order check through main.js on the fake host: Scripts\main.js loads
// the pack some other way (a custom loader), so the order cannot be told: one
// Info Log line, nothing shows, even with other imports in the file.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startWithOwnerMain, shownDialog, importOrderLines, notCheckedLines } from "./import_order_scenario.js";

test("no pack line in Scripts\\main.js is written to the Info Log, and nothing shows", async () => {
    const { fake } = await startWithOwnerMain(["loadAll([\"ExpansionPack\"]);", "import(\"./LaunchVideo.js\");"]);

    assert.equal(shownDialog(fake), null);
    assert.deepEqual(importOrderLines(fake), []);
    assert.equal(notCheckedLines(fake).length, 1);
    assert.match(notCheckedLines(fake)[0], /no import\( of ExpansionPack\/main\.js/);
    assertNoErrorLogged(fake);
});
