// ============================================================
// Avatar Choice in a wide window: 8 columns and 3 rows, one row per sheet
// of portraits, and the flippers go through them in their numbers' order.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, step, openNameEntry, createThroughNameEntry, isAvatarChoiceOpen, portraitRows, portraitsInRows, assertNextGoesInOrder,
} from "./name_entry_scenario.js";

test("a wide window shows Avatar Choice's portraits in 8 columns and 3 rows", async () => {
    const { fake, openPicker } = await startOnWheel({ fakeOptions: { layoutSize: { width: 1920, height: 1080 } } });
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    assert.equal(isAvatarChoiceOpen(fake), true);

    assert.deepEqual(portraitRows(fake), portraitsInRows(8));
    assertNextGoesInOrder(fake);
    assertNoErrorLogged(fake);
});
