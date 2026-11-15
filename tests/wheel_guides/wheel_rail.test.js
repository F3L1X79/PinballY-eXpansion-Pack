// ============================================================
// The Wheel Rail through main.js on an alphabetical wheel: # then A to Z,
// the letters with no table dimmed, the Rail Pill on the selected table's
// letter (accents stripped) following the wheel and Next / Previous Page.
// A move never redraws the base and draws at most one missing pill.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, railDraws, railPillLayers, table } from "./wheel_guides_scenario.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// In PinballY's alphabetical order, as the fake's All Tables lists them.
const TABLES = [
    table("24 Hours", 1994),
    table("Addams Family", 1992),
    table("Black Knight", 1980),
    table("Eight Ball", 1977),
    table("Élan Vital", 1984),
    table("Zaccaria Star", 1986),
];
const ALL_ROWS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const dimmedBut = (...lit) => ALL_ROWS.filter(row => !lit.includes(row));

test("the Wheel Rail lists # and A to Z, and its pill follows the wheel", async () => {
    const { fake } = await startWheelGuides({ tables: TABLES });

    assert.deepEqual(shownRail(fake), { rows: ALL_ROWS, dimmed: dimmedBut("#", "A", "B", "E", "Z"), pill: "#" },
        "on 24 Hours, a title not starting with A-Z, at startup");

    let draws = railDraws(fake);
    for (const [title, letter] of [["Addams Family", "A"], ["Black Knight", "B"], ["Eight Ball", "E"], ["Élan Vital", "E"]]) {
        fake.moveWheel(1);
        assert.equal(fake.getCurrentTable().title, title);
        assert.equal(shownRail(fake).pill, letter, `${title} under ${letter}`);
        const after = railDraws(fake);
        assert.equal(after.base, draws.base, "a move never redraws the base");
        assert.ok(after.pills - draws.pills <= 1, "a move draws at most one missing pill");
        draws = after;
    }

    fake.pressPageButton("NextPage");
    assert.equal(fake.getCurrentTable().title, "Zaccaria Star");
    assert.equal(shownRail(fake).pill, "Z", "Next Page");
    fake.pressPageButton("PrevPage");
    assert.equal(fake.getCurrentTable().title, "Élan Vital");
    assert.equal(shownRail(fake).pill, "E", "Previous Page");
    fake.pressPageButton("PrevPage");
    assert.equal(fake.getCurrentTable().title, "Eight Ball", "É is a page group of its own after E");
    assert.equal(shownRail(fake).pill, "E", "the pill stays on E");

    // Once the buttons rest, the drawing ahead draws every pill: moves then draw nothing.
    fake.advanceTime(10000);
    assert.equal(railPillLayers(fake).length, ALL_ROWS.length, "one pill per row");
    draws = railDraws(fake);
    for (let move = 0; move < TABLES.length; move++) fake.moveWheel(1);
    assert.deepEqual(railDraws(fake), draws, "no draw at all once the pills are drawn ahead");
    assert.deepEqual(layersBreakingTheRule(fake), []);
    assertNoErrorLogged(fake);
});
