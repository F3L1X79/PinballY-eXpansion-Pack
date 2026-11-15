// ============================================================
// The Wheel Rail through main.js with the Wheel Order by year: every decade
// from the oldest to the newest present, the empty ones dimmed, then ? for
// the tables without a year; the Rail Pill on the selected table's decade,
// following the wheel and Next / Previous Page decade by decade.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, table } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// In PinballY's alphabetical order, as the fake's All Tables lists them.
const TABLES = [
    table("Addams Family", 1992),
    table("Black Knight", 1980),
    table("Cyclone", 1988),
    table("Eight Ball", 1977),
    table("Homebrew", null),
    table("Space Odyssey", 2016),
];

test("by year, the Wheel Rail lists decades with ? last, and its pill follows the wheel", async () => {
    const { fake, lang, chooseWheelOrder } = await startWheelGuides({ tables: TABLES });
    await chooseWheelOrder(lang.customMenuLabels.wheelOrderAlphabetical, lang.customMenuLabels.wheelOrderPageByYear);

    const rail = shownRail(fake);
    assert.deepEqual(rail.rows, ["70s", "80s", "90s", "00s", "10s", "?"]);
    assert.deepEqual(rail.dimmed, ["00s"], "the 2000s hold no table");
    assert.equal(fake.getCurrentTable().title, "Addams Family");
    assert.equal(rail.pill, "90s");

    fake.moveWheel(1);
    assert.equal(fake.getCurrentTable().title, "Space Odyssey");
    assert.equal(shownRail(fake).pill, "10s");
    fake.moveWheel(1);
    assert.equal(fake.getCurrentTable().title, "Homebrew");
    assert.equal(shownRail(fake).pill, "?", "a table without a year");

    fake.pressPageButton("NextPage");
    assert.equal(fake.getCurrentTable().title, "Eight Ball", "the wheel wraps to the oldest decade");
    assert.equal(shownRail(fake).pill, "70s");
    fake.pressPageButton("NextPage");
    assert.equal(fake.getCurrentTable().title, "Black Knight");
    assert.equal(shownRail(fake).pill, "80s");
    fake.pressPageButton("PrevPage");
    assert.equal(shownRail(fake).pill, "70s", "Previous Page");
    assertNoErrorLogged(fake);
});
