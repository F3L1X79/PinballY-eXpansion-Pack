// ============================================================
// The Attract Order In Order at startup, through main.js, PinballY's
// "Switch games every" holding the owner's new value instead of the long
// one: that value becomes the kept one, the long value is written for the
// next start, and the pack leaves this session's switches to PinballY.
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

test("the owner's new interval is kept, the long value written, no pack switch this session", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
    fake.seedSettings({ [SWITCH_TIME_KEY]: 12 });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", attractOrderSwitchTime: 10 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "wheelOrder";
    config.language = "en";
    config.attractOrder = "inOrder";
    await import("../../main.js");
    await settle();

    fake.enterAttractMode();
    await settle();
    fake.advanceTime(60000);

    assert.equal(JSON.parse(fake.readFile(CABINET_FILE)).attractOrderSwitchTime, 12);
    assert.equal(fake.storedSettings()[SWITCH_TIME_KEY], "86400");
    assert.deepEqual(fake.wheelMoves(), []);
    assert.ok(fake.logLines().some(line => line.includes("[AttractOrder]") && line.includes("12")), "a log line");
    assertNoErrorLogged(fake);
});
