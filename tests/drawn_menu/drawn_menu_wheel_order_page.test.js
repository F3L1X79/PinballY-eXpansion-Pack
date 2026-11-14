// ============================================================
// The Wheel Order page as a Drawn Menu through main.js: the Filter Picker's
// entry carries the submenu arrow and opens the page drawn, the current
// order marked and highlighted; Exit or Back goes up to the Filter Picker
// on the entry; the other order chosen is put in place, the menus closed.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    OPEN_OVER_MS, drawnMenuLines, readDrawnMenu, highlightedEntry, markedEntries, isDrawnMenuShown, press, openMainMenu, chooseEntry,
} from "./drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "drawnMenus", "wheelOrder"];
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const CABINET_FILE = `${PACK}\\profiles\\cabinet.json`;

const table = (title, year) => ({ id: title, configId: title, title, year });
const TABLES = [table("Attack from Mars", 1995), table("Black Knight", 1980), table("Dracula", 1993)];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
let LABELS;

const cabinetData = () => JSON.parse(fake.readFile(CABINET_FILE) ?? "{}");
const openFilterPicker = () => {
    openMainMenu(fake);
    chooseEntry(fake, LABELS.changeFilter);
    fake.advanceTime(OPEN_OVER_MS);
};
const choose = (title) => {
    chooseEntry(fake, title);
    fake.advanceTime(OPEN_OVER_MS);
};

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    LABELS = lang.customMenuLabels;
    await import("../../main.js");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
});

test("the Filter Picker's Wheel Order entry carries the submenu arrow", () => {
    openFilterPicker();

    assert.ok(markedEntries(fake, "submenu").includes(LABELS.wheelOrderAlphabetical));
});

test("choosing it draws the Wheel Order page, the current order marked and highlighted", () => {
    choose(LABELS.wheelOrderAlphabetical);

    assert.equal(fake.currentMenu(), null, "no native menu");
    assert.deepEqual(readDrawnMenu(fake).rows[0], { kind: "heading", title: LABELS.wheelOrderPage.toUpperCase() });
    assert.deepEqual(drawnMenuLines(fake).slice(1), ["---", LABELS.wheelOrderPageAlphabetical, LABELS.wheelOrderPageByYear, "---", LABELS.filterPickerBack]);
    assert.deepEqual(markedEntries(fake, "radio"), [LABELS.wheelOrderPageAlphabetical]);
    assert.equal(highlightedEntry(fake), LABELS.wheelOrderPageAlphabetical);
});

test("Exit on the page goes back to the Filter Picker, the cursor on the entry", () => {
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(highlightedEntry(fake), LABELS.wheelOrderAlphabetical);
});

test("Back on the page does the same", () => {
    choose(LABELS.wheelOrderAlphabetical);
    choose(LABELS.filterPickerBack);

    assert.equal(highlightedEntry(fake), LABELS.wheelOrderAlphabetical);
});

test("choosing the current order closes the menus and changes nothing", async () => {
    choose(LABELS.wheelOrderAlphabetical);
    choose(LABELS.wheelOrderPageAlphabetical);
    await settle();

    assert.equal(isDrawnMenuShown(fake), false);
    assert.equal(fake.currentFilterId(), "All");
    assert.equal(cabinetData().wheelOrder, undefined);
});

test("choosing the other order puts it in place, saves it and closes the menus", async () => {
    openFilterPicker();
    choose(LABELS.wheelOrderAlphabetical);
    choose(LABELS.wheelOrderPageByYear);
    await settle();

    assert.equal(isDrawnMenuShown(fake), false);
    assert.equal(cabinetData().wheelOrder, "byYear");
    openFilterPicker();
    assert.ok(drawnMenuLines(fake).includes(LABELS.wheelOrderByYear));
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
