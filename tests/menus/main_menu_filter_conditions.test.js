// ============================================================
// Main menu filter conditions: a [Top] script filter with a condition is in
// the Filter Picker only while it holds, checked at each opening; a failing
// one is logged and keeps it listed. A left-out filter still works while current.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createMainMenu } from "../../common/menus/main_menu.js";
import { mainMenuSection, filterPickerSection } from "../support/main_menu_reader.js";
import { errorLines } from "../support/error_log.js";
import lang from "../../common/core/i18n.js";

const TABLES = [
    { id: 1, configId: "mm", title: "Medieval Madness" },
    { id: 2, configId: "tz", title: "Twilight Zone" },
];

function setUp() {
    const fake = createFakePinballYHost({ tables: TABLES });
    // safeHandler logs through PinballY's logfile.
    fake.installGlobals();
    const mainMenu = createMainMenu(fake);
    const topFilter = (id, title, sortKey) =>
        fake.createFilter({ id, title, group: "[Top]", sortKey, select: game => game.configId === "mm" });
    topFilter("test.Shy", "Shy", "4000");
    topFilter("test.Plain", "Plain", "5000");
    return { fake, mainMenu };
}

test("a filter is left out while its condition is false, checked at each opening", () => {
    const { fake, mainMenu } = setUp();
    let shown = false;
    mainMenu.showFilterWhen("User.test.Shy", () => shown);

    assert.deepEqual(filterPickerSection(fake, "All Tables"), ["All Tables", "Plain", "Favorites"]);

    shown = true;
    assert.deepEqual(filterPickerSection(fake, "All Tables"), ["All Tables", "Shy", "Plain", "Favorites"]);
    assert.equal(errorLines(fake).length, 0);
});

test("a failing condition is logged and leaves the filter listed, the rest of the menu unchanged", () => {
    const { fake, mainMenu } = setUp();
    mainMenu.showFilterWhen("User.test.Shy", () => { throw new Error("broken"); });

    assert.deepEqual(filterPickerSection(fake, "All Tables"), ["All Tables", "Shy", "Plain", "Favorites"]);
    // Logged at each opening: reaching the Filter Picker opens the main menu more than once.
    assert.ok(errorLines(fake).length > 0);
    for (const line of errorLines(fake)) assert.match(line, /broken/);
    const entry = lang.customMenuLabels.activeFilter("All Tables");
    assert.deepEqual(mainMenuSection(fake, entry), [entry]);
    assert.deepEqual(mainMenuSection(fake, "Rate Table"),
        ["Add to Favorites", "Rate Table", "Information", "Flyer", "Instruction Card", "Table Scores"]);
});

test("a filter left out keeps working while it is current", () => {
    const { fake, mainMenu } = setUp();
    mainMenu.showFilterWhen("User.test.Shy", () => false);
    fake.selectFilter("User.test.Shy");

    assert.equal(filterPickerSection(fake, "Shy"), null);
    fake.fire("wheelmode");

    assert.equal(fake.currentFilterId(), "User.test.Shy");
    assert.deepEqual(fake.getWheelTables().map(game => game.title), ["Medieval Madness"]);
});
