// ============================================================
// Welcome Screen Collection Mastery card with fewer than ten tables,
// through main.js on the fake PinballY globals: the goal is all of them.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { openCollectionCard, tableNumbered } from "./welcome_screen_collection_scenario.js";

test("with fewer than ten tables, the Collection Mastery goal is all of them", async () => {
    const tables = Array.from({ length: 4 }, (_, index) => tableNumbered(index + 1));
    const { card, errors } = await openCollectionCard({ tables, levels: [2, 2, 1, 1] });

    assert.deepEqual(card, { goal: "Goal: 4 tables at Apprentice", current: "2/4 tables", tier: 1 });
    assert.deepEqual(errors, []);
});
