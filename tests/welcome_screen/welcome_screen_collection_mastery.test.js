// ============================================================
// Welcome Screen Collection Mastery card at a middle tier, through main.js
// on the fake PinballY globals: ten of the twelve tables at Mastery Level
// 3 or above make tier 3, the goal is ten tables at level 4 and four
// already reach it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { openCollectionCard, tableNumbered } from "./welcome_screen_collection_scenario.js";

test("the Collection Mastery card shows the next goal and how far along it is", async () => {
    const tables = Array.from({ length: 12 }, (_, index) => tableNumbered(index + 1));
    const { card, errors } = await openCollectionCard({ tables, levels: [5, 4, 4, 4, 3, 3, 3, 3, 3, 3, 2] });

    assert.deepEqual(card, { goal: "Goal: 10 tables at Adept", current: "4/10 tables", tier: 3 });
    assert.deepEqual(errors, []);
});
