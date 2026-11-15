// ============================================================
// The Wheel Rail through main.js by year with WHEEL_RAIL_YEARS: each
// decade's years under it, smaller, as two digits, the Rail Pill on the
// selected table's year (on ? for a table without one). 66 years, from 1960
// to 2025, shrink the year rows below 13 px so that the rail stays within 1100 px.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, railBaseLayers, table } from "./wheel_guides_scenario.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const YEARS = Array.from({ length: 66 }, (_, index) => 1960 + index);
// In PinballY's alphabetical order, as the fake's All Tables lists them.
const TABLES = [table("Homebrew", null), ...YEARS.map(year => table(`Table ${year}`, year))];

test("with WHEEL_RAIL_YEARS, each decade's years show under it and the pill sits on the year", async () => {
    const { fake, lang, chooseWheelOrder } = await startWheelGuides({ tables: TABLES, settings: { wheelRailYears: true } });
    await chooseWheelOrder(lang.customMenuLabels.wheelOrderAlphabetical, lang.customMenuLabels.wheelOrderPageByYear);

    const rows = [];
    for (const decade of ["60", "70", "80", "90", "00", "10", "20"]) {
        rows.push(`${decade}s`);
        for (let digit = 0; digit < (decade === "20" ? 6 : 10); digit++) rows.push(`${decade.charAt(0)}${digit}`);
    }
    rows.push("?");
    const rail = shownRail(fake);
    assert.deepEqual(rail.rows, rows);
    assert.deepEqual(rail.dimmed, []);
    assert.equal(fake.getCurrentTable().title, "Homebrew");
    assert.equal(rail.pill, "?", "a table without a year");

    const [base] = railBaseLayers(fake).filter(layer => layer.alpha > 0);
    assert.ok(base.canvasSize().height <= 1100, `the rail is ${base.canvasSize().height} px high`);
    const labels = base.strokes().filter(stroke => "text" in stroke);
    const sizeOf = label => labels.find(stroke => stroke.text === label).size;
    assert.equal(sizeOf("80s"), 12, "decades 12 pt");
    assert.equal(sizeOf("84"), 10, "years 10 pt");
    const topOf = label => labels.find(stroke => stroke.text === label).rect.y;
    const yearHeight = topOf("85") - topOf("84");
    // (1100 - 2 × 7 px of margin - 8 decade rows × 30 px) / 66 years: 12.8.
    assert.equal(yearHeight, 12, "year rows below 13 px, as 13 px would not fit");

    fake.moveWheel(1);
    assert.equal(fake.getCurrentTable().title, "Table 1960");
    assert.equal(shownRail(fake).pill, "60", "on the year, not the decade");
    fake.pressPageButton("NextPage");
    assert.equal(fake.getCurrentTable().title, "Table 1970");
    assert.equal(shownRail(fake).pill, "70", "Next Page, decade by decade");
    fake.moveWheel(14);
    assert.equal(shownRail(fake).pill, "84");
    assert.deepEqual(layersBreakingTheRule(fake), []);
    assertNoErrorLogged(fake);
});
