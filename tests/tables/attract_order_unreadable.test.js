// ============================================================
// The Attract Order Whole Wheel at startup, through main.js, PinballY's
// option holding the long value but the kept one unreadable in cabinet.json:
// logged as an error, the option left as it is, the startup goes on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
const table = title => ({ id: title, configId: title, title });
const TABLES = ["Attack from Mars", "Black Knight", "Cirqus Voltaire"].map(table);

test("an unreadable kept value is logged, the option left alone, the startup goes on", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
    fake.seedSettings({ [SWITCH_TIME_KEY]: 86400 });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", attractOrderSwitchTime: "ten" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["wheelOrder", "clock"].includes(key);
    config.language = "en";
    config.attractOrder = "wholeWheel";
    await import("../../main.js");
    await settle();

    fake.enterAttractMode();
    await settle();
    fake.advanceTime(60000);

    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /\[AttractOrder\].*attractOrderSwitchTime/);
    assert.equal(fake.writtenSettingsKeys().has(SWITCH_TIME_KEY), false);
    assert.deepEqual(fake.wheelMoves(), []);
    assert.ok(fake.logLines().some(line => line.includes('"clock" initialized')), "the next Add-on still starts");
});
