// ============================================================
// The Wheel Order saved as "by year" in cabinet.json, through main.js in
// French: the wheel starts by year on the filter PinballY restored, and the
// Filter Picker's entry reads "Ordre : par année".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const table = (title, year) => ({ id: title, configId: title, title, year });
const TABLES = [table("Attack from Mars", 1995), table("Black Knight", 1980), table("Eight Ball", 1977)];

test("saved by year, the wheel starts by year and the entry reads it in French", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 13, 20, 0, 0), tables: TABLES });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", wheelOrder: "byYear" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "wheelOrder"].includes(key);
    config.language = "fr";
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());

    // The table PinballY restored stays selected, the oldest first after it wraps around.
    assert.deepEqual(fake.getWheelTables().map(game => game.title), ["Attack from Mars", "Eight Ball", "Black Knight"]);
    fake.openMainMenu();
    fake.selectMenuItem(lang.customMenuLabels.activeFilter(lang.customMenuLabels.wheelOrderByYear));
    const titles = fake.currentMenu().items.map(item => item.title);

    assert.equal(lang.customMenuLabels.wheelOrderByYear, "Ordre : par année");
    assert.equal(titles.at(-2), "Ordre : par année");
    assertNoErrorLogged(fake);
});
