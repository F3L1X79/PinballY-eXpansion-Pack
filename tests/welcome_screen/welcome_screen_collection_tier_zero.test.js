// ============================================================
// Welcome Screen Collection Mastery card at tier 0, in French, through
// main.js on the fake PinballY globals: three of the twelve tables played,
// the goal is ten tables at the first Mastery Level.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { openCollectionCard, tableNumbered } from "./welcome_screen_collection_scenario.js";

test("at tier 0 the card aims at ten tables at the first level, in French", async () => {
    const tables = Array.from({ length: 12 }, (_, index) => tableNumbered(index + 1));
    const { card, errors } = await openCollectionCard({ tables, levels: [2, 1, 1], language: "fr" });

    assert.deepEqual(card, { goal: "Objectif : 10 tables Novice", current: "3/10 tables", tier: 0 });
    assert.deepEqual(errors, []);
});
