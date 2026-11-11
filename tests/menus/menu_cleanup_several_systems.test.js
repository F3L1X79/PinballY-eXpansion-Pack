// ============================================================
// Menu Cleanup through main.js on a cabinet whose configured tables use
// two systems: Filter by System stays in the Filter Picker, Last Played
// and Date Added still go; unconfigured tables count no system; the count
// follows a settings reload.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { filterPickerSection } from "../support/main_menu_reader.js";

const VPX = { displayName: "Visual Pinball X" };
const PINBALL_FX = { displayName: "Pinball FX" };
const FUTURE_PINBALL = { displayName: "Future Pinball" };
const table = (id, system, more = {}) => ({ id, configId: `table${id}`, title: `Table ${id}`, system, ...more });

const GROUPS_WITH_SYSTEM = ["Filter by Era", "Filter by Manufacturer", "Filter by System", "Filter by Category", "Filter by Rating"];
const GROUPS_WITHOUT_SYSTEM = ["Filter by Era", "Filter by Manufacturer", "Filter by Category", "Filter by Rating"];

const fake = createFakePinballYHost({
    now: new Date(2026, 8, 30, 20, 0, 0),
    tables: [table(1, VPX), table(2, PINBALL_FX), table(3, VPX)],
});
const filterGroups = () => filterPickerSection(fake, "Filter by Era");

test("with tables on two systems, Filter by System stays; Last Played and Date Added still go", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = key === "customMenuCommands" || key === "menuCleanup";
    }
    config.language = "en";
    await import("../../main.js");

    assert.deepEqual(filterGroups(), GROUPS_WITH_SYSTEM);
    assertNoErrorLogged(fake);
});

test("after a settings reload down to one configured system, Filter by System goes; unconfigured tables count none", () => {
    fake.setTables([table(1, VPX), table(3, VPX), table(4, FUTURE_PINBALL, { isConfigured: false }), table(5, undefined, { isConfigured: false })]);
    fake.fire("settingsreload");

    assert.deepEqual(filterGroups(), GROUPS_WITHOUT_SYSTEM);
    assertNoErrorLogged(fake);
});

test("with no configured table, Filter by System goes", () => {
    fake.setTables([]);
    fake.fire("settingsreload");

    assert.deepEqual(filterGroups(), GROUPS_WITHOUT_SYSTEM);
    assertNoErrorLogged(fake);
});

test("after a settings reload back to two systems, Filter by System is back", () => {
    fake.setTables([table(1, VPX), table(2, PINBALL_FX)]);
    fake.fire("settingsreload");

    assert.deepEqual(filterGroups(), GROUPS_WITH_SYSTEM);
    assertNoErrorLogged(fake);
});
