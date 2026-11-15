// ============================================================
// The Wheel Rail through main.js with the Wheel Order by year: PinballY's
// Hidden Tables and Unconfigured, which the Wheel Order never copies, stay
// alphabetical, so their rail shows letters.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, TABLES, table } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const lit = fake => "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(row => !shownRail(fake).dimmed.includes(row));

test("by year, Hidden Tables and Unconfigured still show letters", async () => {
    const { fake, lang, chooseWheelOrder } = await startWheelGuides({
        tables: [...TABLES, table("Old Secret", 1985, { isHidden: true }), table("Backup", 1979, { isConfigured: false })],
    });
    await chooseWheelOrder(lang.customMenuLabels.wheelOrderAlphabetical, lang.customMenuLabels.wheelOrderPageByYear);
    // The player opens PinballY's own filter from its menu, which then closes.
    const showFromMenu = async (configIds, filterId) => {
        fake.openMainMenu();
        fake.setWheelTables(configIds, { filterId });
        fake.closeMenu();
        await settle();
        fake.advanceTime(300);
        await settle();
    };

    await showFromMenu(["Old Secret"], "Hidden");
    assert.deepEqual(lit(fake), ["O"], "Hidden Tables");
    assert.equal(shownRail(fake).pill, "O");

    await showFromMenu(["Backup"], "Unconfigured");
    assert.deepEqual(lit(fake), ["B"], "Unconfigured");
    assert.equal(shownRail(fake).pill, "B");
    assertNoErrorLogged(fake);
});
