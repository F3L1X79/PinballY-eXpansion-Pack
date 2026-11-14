// ============================================================
// The Wheel Order Add-on turned off, through main.js: no entry in the
// Filter Picker, and the wheel stays alphabetical, the pack's own filters
// too, even with "by year" saved in cabinet.json.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const table = (title, year) => ({ id: title, configId: title, title, year });
const TABLES = [table("Attack from Mars", 1995), table("Black Knight", 1980), table("Eight Ball", 1977)];

test("turned off, the Filter Picker has no Wheel Order entry and the wheel stays alphabetical", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 13, 20, 0, 0), tables: TABLES });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", wheelOrder: "byYear" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "customFilter"].includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());

    fake.openMainMenu();
    fake.selectMenuItem(lang.customMenuLabels.activeFilter("All Tables"));
    const titles = fake.currentMenu().items.map(item => item.title);

    assert.ok(!titles.includes(lang.customMenuLabels.wheelOrderAlphabetical), titles.join(" | "));
    assert.ok(!titles.includes(lang.customMenuLabels.wheelOrderByYear), titles.join(" | "));
    assert.equal(fake.currentFilterId(), "All");
    assert.deepEqual(fake.getWheelTables().map(game => game.title), ["Attack from Mars", "Black Knight", "Eight Ball"]);

    while (fake.currentMenu()) fake.pressExitInMenu();
    fake.chooseFilter("User.project.OriginalTables");
    await settle();
    assert.deepEqual(fake.getWheelTables().map(game => game.title), ["Attack from Mars", "Black Knight", "Eight Ball"],
        "the pack's own filters alphabetical too");
    assertNoErrorLogged(fake);
});
