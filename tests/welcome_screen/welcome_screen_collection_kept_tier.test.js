// ============================================================
// A Collection Tier kept in profile.json on the Welcome Screen, through
// main.js on the fake PinballY globals: once a table left the visible set
// and the tables reach only tier 1, the card still shows tier 2 and aims
// at the level above it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { openCollectionCard, tableNumbered } from "./welcome_screen_collection_scenario.js";

test("the Collection Mastery card shows a kept tier after a table left the visible set", async () => {
    const tables = Array.from({ length: 11 }, (_, index) => tableNumbered(index + 1, { isHidden: index === 0 }));
    // The hidden table was the tenth at level 2: nine are left.
    const levels = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1];
    const { card, errors } = await openCollectionCard({ tables, levels, profile: { collectionTier: 2 } });

    assert.deepEqual(card, { goal: "Goal: 10 tables at Regular", current: "0/10 tables", tier: 2 });
    assert.deepEqual(errors, []);
});
