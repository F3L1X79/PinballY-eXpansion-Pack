// ============================================================
// Backglass Clock during a media capture (launched with command.CaptureGo),
// through main.js on the fake PinballY globals: never shown nor raised, so no frozen
// time is recorded into a table's backglass video.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };

test("a media capture never shows the Backglass Clock", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 30, 21, 47, 30), tables: [TABLE], monitorCount: 2 });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();
    fake.playGame(TABLE, { command: command.CaptureGo });
    fake.gameStarted(TABLE);
    fake.advanceTime(3 * 60 * 1000);
    fake.gameOver(TABLE);
    await settle();

    assert.deepEqual(clock.calls(), [{ call: "showWindow", visible: false }], "only the hide at startup");
    assert.ok(clock.layers().every(layer => layer.texts().length === 0), "never drawn");
    assertNoErrorLogged(fake);
});
