// ============================================================
// A Child Profile's Collection Mastery card on the Welcome Screen, through
// main.js on the fake PinballY globals: the Adult Table it played but can
// no longer see does not count, nor does it in the goal.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { openCollectionCard, tableNumbered } from "./welcome_screen_collection_scenario.js";

test("a Child Profile's Collection Mastery counts only the tables it can see", async () => {
    const tables = [tableNumbered(1, { categories: ["NSFW"] }), ...Array.from({ length: 4 }, (_, index) => tableNumbered(index + 2))];
    const { card, errors } = await openCollectionCard({ tables, levels: [2, 1, 1, 1], profile: { isChild: true } });

    assert.deepEqual(card, { goal: "Goal: 4 tables at Rookie", current: "3/4 tables", tier: 0 });
    assert.deepEqual(errors, []);
});
