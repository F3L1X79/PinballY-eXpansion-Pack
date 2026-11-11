// ============================================================
// Game Setup's category menu as a Drawn Menu through main.js, over the
// native menu kept open: ticking redraws the checks in place, and every
// way out closes the native menu, so PinballY drops its edit list
// (docs/pinbally/pinbally-help.md, 4.2): the next table never gets the
// last one's ticks, and a category filter filters again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isDrawnMenuShown, markedEntries, highlightedEntry, press, chooseEntry, OPEN_OVER_MS } from "./drawn_menu_reader.js";

const TABLES = [
    { id: 1, configId: "mm", title: "Medieval Madness", manufacturer: "Williams", year: 1997, isHidden: false },
    { id: 2, configId: "tz", title: "Twilight Zone", manufacturer: "Bally", year: 1993, isHidden: false },
];
const MENU_ID = "game categories";
const CATEGORY_COMMANDS = new Map([["Bally", 3001], ["Williams", 3002]]);
const OPEN_CATEGORIES = 3100;
const SAVE = 3101;
const EDIT_CATEGORIES = 3102;

const fake = createFakePinballYHost({ now: new Date(2026, 10, 11, 20, 0, 0), tables: TABLES });

// PinballY's own category menu, as its source works (see the header).
const pinballY = { editList: null, reshowing: false, saved: new Map([["mm", []], ["tz", []]]), filtered: [] };
const selectedTable = () => fake.getCurrentTable().configId;

function categoryItems() {
    const builtIn = name => fake.getBuiltInCommand(name);
    return [
        { title: "", cmd: builtIn("MenuPageUp"), stayOpen: true },
        ...[...CATEGORY_COMMANDS].map(([title, cmd]) => ({ title, cmd, stayOpen: true, checked: pinballY.editList.includes(title) })),
        { title: "", cmd: builtIn("MenuPageDown"), stayOpen: true },
        { cmd: -1 },
        { title: "Edit Categories", cmd: EDIT_CATEGORIES },
        { cmd: -1 },
        { title: "Save", cmd: SAVE },
        { title: "Cancel", cmd: builtIn("MenuReturn") },
    ];
}

function openCategories() {
    fake.doCommand(OPEN_CATEGORIES);
    fake.advanceTime(OPEN_OVER_MS);
}

test("setup", async () => {
    fake.setNativeCommand(OPEN_CATEGORIES, () => {
        if (!pinballY.editList) pinballY.editList = [...pinballY.saved.get(selectedTable())];
        fake.openMenu(MENU_ID, categoryItems());
    });
    for (const [title, cmd] of CATEGORY_COMMANDS) {
        fake.setNativeCommand(cmd, () => {
            if (!pinballY.editList) {
                pinballY.filtered.push(title);
                return;
            }
            const list = pinballY.editList;
            pinballY.editList = list.includes(title) ? list.filter(name => name !== title) : [...list, title];
            // Shown again: "menuopen" for the new menu, then "menuclose" for the old one.
            pinballY.reshowing = true;
            fake.openMenu(MENU_ID, categoryItems());
            fake.fire("menuclose", { id: MENU_ID });
            pinballY.reshowing = false;
        });
    }
    fake.setNativeCommand(SAVE, () => { pinballY.saved.set(selectedTable(), [...pinballY.editList]); });
    fake.on("menuclose", () => { if (!pinballY.reshowing) pinballY.editList = null; });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("ticking redraws the checks over the native menu kept open, the cursor staying on the category", () => {
    openCategories();
    assert.ok(isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu().id, MENU_ID, "the native menu stays open under the Drawn Menu");
    assert.deepEqual(markedEntries(fake, "check"), []);

    chooseEntry(fake, "Bally");
    assert.deepEqual(markedEntries(fake, "check"), ["Bally"]);
    assert.equal(highlightedEntry(fake), "Bally");
});

test("Save writes the ticks to the table and closes the native menu, so the next table opens with its own", async () => {
    chooseEntry(fake, "Save");
    await settle();
    assert.deepEqual(pinballY.saved.get("mm"), ["Bally"]);
    assert.equal(fake.currentMenu(), null, "the native menu is closed");
    assert.equal(pinballY.editList, null, "PinballY dropped its edit list");
    assert.equal(isDrawnMenuShown(fake), false);

    fake.moveWheel(1);
    openCategories();
    assert.deepEqual(markedEntries(fake, "check"), [], "nothing of Medieval Madness's ticks");
});

test("Exit and Cancel close the native menu too, and a category filter then filters", async () => {
    chooseEntry(fake, "Williams");
    press(fake, "Exit");
    await settle();
    assert.equal(fake.currentMenu(), null);
    assert.equal(isDrawnMenuShown(fake), false);

    openCategories();
    assert.deepEqual(markedEntries(fake, "check"), [], "the tick left with Exit is gone");
    chooseEntry(fake, "Williams");
    chooseEntry(fake, "Cancel");
    await settle();
    assert.equal(fake.currentMenu(), null);
    assert.deepEqual(pinballY.saved.get("tz"), [], "Cancel saves nothing");

    fake.runCommand(CATEGORY_COMMANDS.get("Bally"));
    assert.deepEqual(pinballY.filtered, ["Bally"], "the wheel is filtered, not a category ticked");
    assertNoErrorLogged(fake);
});
