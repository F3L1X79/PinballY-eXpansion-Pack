// ============================================================
// The Attract Order As PinballY (the default) through main.js, nothing kept
// in cabinet.json: the pack never moves the wheel in attract mode and never
// writes PinballY's "Switch games every".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
const table = title => ({ id: title, configId: title, title });
const TABLES = ["Attack from Mars", "Black Knight", "Cirqus Voltaire"].map(table);

test("As PinballY, attract mode is PinballY's alone", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
    fake.seedSettings({ [SWITCH_TIME_KEY]: 10 });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "wheelOrder";
    config.language = "en";
    assert.equal(config.attractOrder, "pinballY", "the default");
    await import("../../main.js");
    await settle();

    fake.enterAttractMode();
    await settle();
    fake.advanceTime(60000);
    fake.exitAttractMode();

    assert.equal(fake.getCurrentTable().title, "Attack from Mars");
    assert.deepEqual(fake.wheelMoves(), []);
    assert.equal(fake.writtenSettingsKeys().has(SWITCH_TIME_KEY), false);
    assertNoErrorLogged(fake);
});
