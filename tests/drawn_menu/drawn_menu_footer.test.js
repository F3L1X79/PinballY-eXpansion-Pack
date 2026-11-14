// ============================================================
// The Drawn main menu's footer, through main.js on the fake PinballY
// globals: the main menu shows the "Change Filter" entry with its arrow
// and a footer under the list names the Active Filter; the cursor never
// lands on it; no other Drawn Menu has one; it follows a filter change;
// a name too long for it is cut.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { OPEN_OVER_MS, readDrawnMenu, highlightedEntry, press, openMainMenu, openExitMenu, chooseEntry } from "./drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "drawnMenus"];
// PinballY's own filter for the 1980s, in the Era group.
const ERA_1980S_FILTER = "YearRange.1980.1989";

const fake = createFakePinballYHost({ now: new Date(2026, 9, 15, 20, 0, 0) });

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    await import("../../main.js");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
});

test("the main menu draws the Change Filter entry and a footer naming the Active Filter", () => {
    openMainMenu(fake);

    const { rows, footer } = readDrawnMenu(fake);
    const line = rows.find(row => row.title === "Change Filter");
    assert.ok(line, "the Change Filter line");
    assert.equal(line.mark, "submenu");
    assert.ok(!rows.some(row => row.title && row.title.startsWith("Active filter")));
    assert.deepEqual(footer, [{ label: "Active filter:", name: "All Tables" }], "no Wheel Order line, its Add-on off");
    assert.equal(rows.at(-1).title, "Return", "the footer under Return, the last line");
    press(fake, "Exit");
});

test("the cursor never lands on the footer, wrapping included", () => {
    openMainMenu(fake);
    const { rows } = readDrawnMenu(fake);
    const entries = rows.filter(row => row.kind === "entry").map(row => row.title);

    press(fake, "Prev");
    assert.equal(highlightedEntry(fake), entries.at(-1));
    press(fake, "Next");
    assert.equal(highlightedEntry(fake), entries[0]);
    press(fake, "Exit");
});

test("the Filter Picker and the Exit menu have no footer", () => {
    openMainMenu(fake);
    chooseEntry(fake, "Change Filter");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(readDrawnMenu(fake).footer, null, "the Filter Picker");
    press(fake, "Exit");
    press(fake, "Exit");

    openExitMenu(fake);
    assert.equal(readDrawnMenu(fake).footer, null, "the Exit menu");
    press(fake, "Exit");
});

test("the footer follows a filter change on the next opening", () => {
    fake.setCurrentFilter(ERA_1980S_FILTER);
    openMainMenu(fake);

    assert.equal(readDrawnMenu(fake).footer[0].name, "1980s Tables");
    press(fake, "Exit");
});

test("a name too long for the footer is cut with an ellipsis", () => {
    fake.createFilter({ id: "LongName", title: "Tables From The Golden Age Of Electromechanical Pinball Machines", select: () => true });
    fake.setCurrentFilter("User.LongName");
    openMainMenu(fake);

    const [{ name }] = readDrawnMenu(fake).footer;
    assert.ok(name.endsWith("\u2026"), name);
    assert.ok("Tables From The Golden Age Of Electromechanical Pinball Machines".startsWith(name.slice(0, -1)), name);
    press(fake, "Exit");
});

test("no error is logged", () => {
    assertNoErrorLogged(fake);
});
