// ============================================================
// The Attract Order In Order with the Wheel Order by year, through main.js:
// attract mode walks through the wheel oldest first, a chronological tour.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const STEP_MS = 5000;
const table = (title, year) => ({ id: title, configId: title, title, year });
// In PinballY's alphabetical order.
const TABLES = [table("Attack from Mars", 1995), table("Black Knight", 1980), table("Eight Ball", 1977), table("Funhouse", 1990)];

test("In Order follows the Wheel Order by year", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
    fake.seedSettings({ "AttractMode.SwitchTime": 86400 });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", wheelOrder: "byYear", attractOrderSwitchTime: 5 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "wheelOrder";
    config.language = "en";
    config.attractOrder = "inOrder";
    await import("../../main.js");
    await settle();

    // Restored on Attack from Mars, the latest: the tour wraps to the oldest.
    fake.enterAttractMode();
    await settle();
    const shown = [];
    for (let step = 0; step < 4; step++) {
        fake.advanceTime(STEP_MS);
        shown.push(fake.getCurrentTable().title);
    }

    assert.deepEqual(shown, ["Eight Ball", "Black Knight", "Funhouse", "Attack from Mars"]);
    assertNoErrorLogged(fake);
});
