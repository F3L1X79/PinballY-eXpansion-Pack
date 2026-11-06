// ============================================================
// Avatar Choice in a tall window: 4 columns and 6 rows, in the same order
// as the wide grid, and the flippers go through them in the same order.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, step, openNameEntry, createThroughNameEntry, isAvatarChoiceOpen, portraitRows, portraitsInRows, assertNextGoesInOrder,
} from "./name_entry_scenario.js";

test("a tall window shows Avatar Choice's portraits in 4 columns and 6 rows", async () => {
    const { fake, openPicker } = await startOnWheel({ fakeOptions: { layoutSize: { width: 1080, height: 1920 } } });
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    assert.equal(isAvatarChoiceOpen(fake), true);

    assert.deepEqual(portraitRows(fake), portraitsInRows(4));
    assertNextGoesInOrder(fake);
    assertNoErrorLogged(fake);
});
