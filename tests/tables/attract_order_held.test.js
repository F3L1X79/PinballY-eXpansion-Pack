// ============================================================
// The Attract Order In Order through main.js, attract mode held off: a
// prevented "attractmodestart", even by a listener after the pack's, starts
// no switching; the next attract mode that does start switches as usual,
// and never moves a wheel of a single table.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const STEP_MS = 8000;
const table = title => ({ id: title, configId: title, title });
const TABLES = ["Attack from Mars", "Black Knight", "Cirqus Voltaire"].map(table);

test("a held attract mode starts no switching", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
    fake.seedSettings({ "AttractMode.SwitchTime": 86400 });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", attractOrderSwitchTime: 8 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "wheelOrder";
    config.language = "en";
    config.attractOrder = "inOrder";
    await import("../../main.js");
    await settle();
    // Registered after the pack's: holds attract mode off as a drawn screen's attract hold does.
    let isHeld = true;
    fake.on("attractmodestart", ev => { if (isHeld) ev.preventDefault(); });

    fake.enterAttractMode();
    await settle();
    fake.advanceTime(3 * STEP_MS);

    assert.equal(fake.getUIMode(), "wheel");
    assert.deepEqual(fake.wheelMoves(), []);

    isHeld = false;
    fake.enterAttractMode();
    await settle();
    fake.advanceTime(STEP_MS);

    assert.equal(fake.getCurrentTable().title, "Black Knight");

    // A filter showing a single table: the switches go on without moving it.
    const moves = fake.wheelMoves().length;
    fake.setWheelTables(["Black Knight"]);
    fake.advanceTime(3 * STEP_MS);

    assert.equal(fake.wheelMoves().length, moves);
    assertNoErrorLogged(fake);
});
