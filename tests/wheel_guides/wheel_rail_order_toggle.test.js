// ============================================================
// The Wheel Rail through main.js follows the Wheel Order: a toggle switches
// it between letters and decades at once (no delayed read), and a filter
// chosen by year shows that filter's decades.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, TABLES, table } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

test("a Wheel Order toggle switches the rail between letters and decades at once", async () => {
    const { fake, lang, chooseWheelOrder, chooseInFilterPicker } = await startWheelGuides({
        tables: [...TABLES, table("Space Odyssey", 2016), table("Tron", null)],
    });
    assert.deepEqual(shownRail(fake).rows, LETTERS);

    await chooseWheelOrder(lang.customMenuLabels.wheelOrderAlphabetical, lang.customMenuLabels.wheelOrderPageByYear);
    assert.equal(fake.getCurrentTable().title, "Addams Family");
    assert.deepEqual(shownRail(fake), { rows: ["70s", "80s", "90s", "00s", "10s", "?"], dimmed: ["00s"], pill: "90s" },
        "decades at once");

    // Favorite Tables: Addams Family (1992), Cyclone (1988), Eight Ball (1977).
    await chooseInFilterPicker("Favorites");
    assert.deepEqual(shownRail(fake), { rows: ["70s", "80s", "90s", "?"], dimmed: ["?"], pill: "90s" }, "Favorite Tables' decades");
    fake.moveWheel(1);
    assert.equal(fake.getCurrentTable().title, "Eight Ball", "from Addams Family, the newest, the wheel wraps");
    assert.equal(shownRail(fake).pill, "70s");

    await chooseWheelOrder(lang.customMenuLabels.wheelOrderByYear, lang.customMenuLabels.wheelOrderPageAlphabetical);
    const rail = shownRail(fake);
    assert.deepEqual(rail.rows, LETTERS, "letters at once");
    assert.equal(fake.getCurrentTable().title, "Eight Ball");
    assert.equal(rail.pill, "E");
    assert.deepEqual(LETTERS.filter(row => !rail.dimmed.includes(row)), ["A", "C", "E"], "Favorite Tables' letters");
    assertNoErrorLogged(fake);
});
