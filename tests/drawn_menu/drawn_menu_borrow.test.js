// ============================================================
// An effect borrowing the open Drawn Menu through main.js: what it reads of
// the menu, the buttons ignored, the menu hidden with its fade finished, and
// the menu given back whole, or the borrower told when it closes meanwhile.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";
import { whileDrawsFail } from "../support/failing_draws.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { DRAWN_MENU_Z_INDEX } from "../../common/drawn_menu/drawn_menu_painter.js";
import { OPEN_OVER_MS, isDrawnMenuShown, drawnMenuLines, highlightedEntry, press } from "./drawn_menu_reader.js";

const LINES = ["First", "Second", "Third"];
const PANEL_ZS = [DRAWN_MENU_Z_INDEX.panel, DRAWN_MENU_Z_INDEX.texts, DRAWN_MENU_Z_INDEX.selection, DRAWN_MENU_Z_INDEX.selectedText, DRAWN_MENU_Z_INDEX.glass];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 9, 20, 0, 0) });
let menus;
let commands;

function showMenu() {
    menus().show("borrowed", LINES.map((title, index) => ({ title, cmd: commands[index] })));
}

// The alphas of the panel's layers that are shown.
const panelAlphas = () => fake.drawingLayers().filter(layer => PANEL_ZS.includes(layer.zIndex) && layer.alpha > 0).map(layer => layer.alpha);

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
    commands = LINES.map((title, index) => globalThis.command.allocate(`borrowTest${index}`));
    ({ getDrawnMenus: menus } = await import("../../common/drawn_menu/drawn_menu.js"));
});

test("no menu can be borrowed when none is open", () => {
    assert.equal(menus().borrow({ onLost() {} }), null);
});

test("the borrower reads the open menu, whose buttons are swallowed and ignored until it is given back", () => {
    showMenu();
    fake.advanceTime(OPEN_OVER_MS);
    const borrowed = menus().borrow({ onLost() { assert.fail("not lost"); } });
    assert.deepEqual(borrowed.view.model.entries.map(index => borrowed.view.model.rows[index].title), LINES);
    assert.ok(borrowed.view.geometry.panel.width > 0);
    assert.equal(borrowed.view.windowSize.width, 1920);
    assert.equal(menus().borrow({ onLost() {} }), null, "one borrower at a time");

    const commandsBefore = fake.executedCommands().length;
    for (const button of ["Next", "Select", "Exit"]) assert.ok(press(fake, button).defaultPrevented, button);
    assert.equal(highlightedEntry(fake), LINES[0]);
    assert.equal(fake.executedCommands().length, commandsBefore);
    assert.ok(isDrawnMenuShown(fake), "Exit did not close it");

    borrowed.giveBack();
    press(fake, "Next");
    assert.equal(highlightedEntry(fake), LINES[1], "the buttons work again");
    press(fake, "Exit");
});

test("hiding finishes the fade at once, and the menu comes back whole at full alpha", () => {
    showMenu();
    const borrowed = menus().borrow({ onLost() {} });
    borrowed.hideMenu();
    assert.deepEqual(panelAlphas(), [], "hidden even though its fade had just started");
    assert.deepEqual(layersBreakingTheRule(fake), []);
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(panelAlphas(), [], "the fade does not bring it back");

    borrowed.giveBack();
    assert.ok(panelAlphas().length >= PANEL_ZS.length);
    assert.ok(panelAlphas().every(alpha => alpha === 1));
    assert.deepEqual(layersBreakingTheRule(fake), []);
    assert.deepEqual(drawnMenuLines(fake), LINES);
    assert.equal(highlightedEntry(fake), LINES[0]);
    borrowed.giveBack();
    press(fake, "Exit");
    assert.ok(!isDrawnMenuShown(fake));
});

test("the borrower is told when the menu closes under it, and its late calls touch nothing", () => {
    showMenu();
    fake.advanceTime(OPEN_OVER_MS);
    let lost = 0;
    const borrowed = menus().borrow({ onLost() { lost++; } });
    fake.fire("attractmodestart", {});
    assert.equal(lost, 1);
    assert.ok(!isDrawnMenuShown(fake));

    showMenu();
    fake.advanceTime(OPEN_OVER_MS);
    borrowed.hideMenu();
    assert.ok(isDrawnMenuShown(fake), "the next menu is not the borrower's");
    borrowed.giveBack();
    assert.equal(lost, 1);
    press(fake, "Exit");
});

test("no error was logged so far", () => {
    assertNoErrorLogged(fake);
});

test("a menu that cannot be redrawn when given back closes instead of staying hidden, swallowing every button", () => {
    let closed = 0;
    menus().show("borrowed", LINES.map((title, index) => ({ title, cmd: commands[index] })), { onClose() { closed++; } });
    fake.advanceTime(OPEN_OVER_MS);
    const borrowed = menus().borrow({ onLost() {} });
    borrowed.hideMenu();
    whileDrawsFail(() => borrowed.giveBack());
    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(closed, 1);
    assert.equal(press(fake, "Next").defaultPrevented, false, "nothing swallows the buttons any more");
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes("[DrawnMenus]") && errors[0].includes("given back"), errors[0]);
});
