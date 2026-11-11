// ============================================================
// PinballY's own menu box as its source lays it out, for the cover of a
// native menu kept open (docs/pinbally/pinbally-help.md, 4.2), and the
// panel laid out around it: centred on it and at least as tall.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeMenuBox, menuFontPointsOf, computeGeometry } from "../../common/drawn_menu/drawn_menu_painter.js";
import { buildMenuModel } from "../../common/drawn_menu/drawn_menu.js";

const WINDOW = { width: 1920, height: 1080 };
const UNIT = WINDOW.height / 1920;
const PAGE_UP = 5;
const PAGE_DOWN = 6;
const PAGING = { pagingCommands: [PAGE_UP, PAGE_DOWN] };
const entries = count => Array.from({ length: count }, (_, index) => ({ title: `Entry ${index + 1}`, cmd: 100 + index }));
const boxOf = (items, points = 42) => nativeMenuBox(WINDOW, items, { menuFontPoints: points, ...PAGING });

test("810 of 1920 reference pixels wide, centred across the window", () => {
    const box = boxOf(entries(3));
    assert.equal(box.width, 810 * UNIT);
    assert.equal(box.x, (WINDOW.width - box.width) / 2);
});

test("a short menu is centred a quarter of the height down; a tall one keeps a sixteenth above it", () => {
    const short = boxOf(entries(3));
    assert.ok(Math.abs(short.y + short.height / 2 - WINDOW.height / 4) < 1e-9);
    const tall = boxOf(entries(12));
    assert.ok(Math.abs(tall.y - WINDOW.height / 16) < 1e-9);
});

test("a separator adds 12 reference pixels, an entry a line of the menu font", () => {
    const withSeparator = boxOf([...entries(2), { cmd: -1 }]);
    assert.ok(Math.abs(withSeparator.height - boxOf(entries(2)).height - 12 * UNIT) < 1e-9);
    assert.ok(boxOf(entries(2), 60).height > boxOf(entries(2), 42).height, "a larger menu font, taller lines");
});

test("Page Up and Page Down count only once the paged section is paginated past 1440 reference pixels", () => {
    const paged = items => [{ title: "", cmd: PAGE_UP, stayOpen: true }, ...items, { title: "", cmd: PAGE_DOWN, stayOpen: true }];
    assert.equal(boxOf(paged(entries(3))).height, boxOf(entries(3)).height);
    assert.ok(boxOf(paged(entries(40))).height <= 1440 * UNIT);
});

test("the menu font's points come from PinballY's MenuFont setting, 42 by default", () => {
    assert.equal(menuFontPointsOf("* * *"), 42);
    assert.equal(menuFontPointsOf(""), 42);
    assert.equal(menuFontPointsOf("36pt bold Tahoma"), 36);
    assert.equal(menuFontPointsOf("50 * *"), 50);
});

test("laid out around the native box, the panel is centred on it and at least as tall", () => {
    const items = entries(12);
    const around = boxOf(items);
    const model = buildMenuModel(items, PAGING);
    const measure = () => 40;
    const { panel } = computeGeometry(WINDOW, model, measure, { around });
    assert.ok(panel.height >= around.height);
    assert.ok(Math.abs(panel.y + panel.height / 2 - (around.y + around.height / 2)) < 1e-9);
    const free = computeGeometry(WINDOW, model, measure);
    assert.notEqual(free.panel.y, panel.y, "without it, the panel keeps its usual place");
});
