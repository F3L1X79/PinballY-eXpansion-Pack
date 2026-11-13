// ============================================================
// The Wheel Order module's year compare, alone: oldest first, ties by title,
// tables without a year last, alphabetically.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { compareByYear } from "../../common/tables/wheel_order.js";

const table = (title, year) => ({ title, year });

test("by year: oldest first, the same year by title, tables without a year last by title", () => {
    const tables = [
        table("Zebra", undefined), table("Medieval Madness", 1997), table("Attack from Mars", 1995),
        table("Apollo", 0), table("Cirqus Voltaire", 1997), table("Abra Ca Dabra", 1975), table("Bonus", -3),
    ];

    assert.deepEqual([...tables].sort(compareByYear).map(game => game.title), [
        "Abra Ca Dabra", "Attack from Mars", "Cirqus Voltaire", "Medieval Madness", "Apollo", "Bonus", "Zebra",
    ]);
});

test("a year PinballY gives as text sorts as its number", () => {
    const tables = [table("Later", "2001"), table("Earlier", "1999")];

    assert.deepEqual([...tables].sort(compareByYear).map(game => game.title), ["Earlier", "Later"]);
});
