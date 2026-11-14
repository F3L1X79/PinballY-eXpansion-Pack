// ============================================================
// The Attract Order As PinballY at startup, through main.js, with a value
// still kept in cabinet.json (a hand-edited .env.local): the kept value is
// written back to PinballY's "Switch games every" and forgotten, and the
// pack never moves the wheel in attract mode.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
const table = title => ({ id: title, configId: title, title });
const TABLES = ["Attack from Mars", "Black Knight", "Cirqus Voltaire"].map(table);

test("As PinballY with a kept value, the kept value goes back to PinballY", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
    fake.seedSettings({ [SWITCH_TIME_KEY]: 86400 });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", attractOrderSwitchTime: 10 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "wheelOrder";
    config.language = "en";
    config.attractOrder = "pinballY";
    await import("../../main.js");
    await settle();

    fake.enterAttractMode();
    await settle();
    fake.advanceTime(60000);

    assert.equal(fake.storedSettings()[SWITCH_TIME_KEY], "10");
    assert.equal(JSON.parse(fake.readFile(CABINET_FILE)).attractOrderSwitchTime, undefined);
    assert.deepEqual(fake.wheelMoves(), []);
    assertNoErrorLogged(fake);
});
