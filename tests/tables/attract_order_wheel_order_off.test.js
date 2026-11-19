// ============================================================
// The Attract Order In Order through main.js with the Wheel Order Add-on
// off: the Attract Order starts with the pack all the same, so attract mode
// moves through the wheel's tables, PinballY's option and the kept value untouched.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
const STEP_MS = 10000;
const table = title => ({ id: title, configId: title, title });
const TABLES = ["Attack from Mars", "Black Knight", "Cirqus Voltaire"].map(table);

test("with the Wheel Order Add-on off, In Order still moves through the wheel", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
    fake.seedSettings({ [SWITCH_TIME_KEY]: 86400 });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", attractOrderSwitchTime: 10 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = false;
    config.language = "en";
    config.attractOrder = "inOrder";
    await import("../../main.js");
    await settle();

    fake.enterAttractMode();
    await settle();
    fake.advanceTime(2 * STEP_MS);

    assert.equal(fake.getCurrentTable().title, "Cirqus Voltaire");
    assert.deepEqual(fake.wheelMoves(), [{ offset: 1, animate: true, fast: false }, { offset: 1, animate: true, fast: false }]);
    assert.deepEqual([...fake.writtenSettingsKeys()].filter(key => key === SWITCH_TIME_KEY), []);
    assert.equal(JSON.parse(fake.readFile(CABINET_FILE)).attractOrderSwitchTime, 10);
    assertNoErrorLogged(fake);
});
