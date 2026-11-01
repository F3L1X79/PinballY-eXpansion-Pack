// ============================================================
// Backglass Clock when a launch ends without "gamestarted", through main.js
// on the fake PinballY globals: shown at "prelaunch", it goes away with a
// failed or cancelled launch, and no raise is left behind on the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };

test("a failed or cancelled launch leaves no Backglass Clock on screen", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 30, 21, 47, 30), tables: [TABLE], monitorCount: 2 });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();
    fake.playGame(TABLE);
    assert.equal(clock.isVisible(), true, "shown as the table launches");
    fake.launchError(TABLE);
    assert.equal(clock.isVisible(), false, "gone with the failed launch");
    assert.equal(clock.calls().at(-1).after, "NOTOPMOST", "and lowered");
    const afterLaunch = clock.calls().length;
    fake.advanceTime(10 * 60 * 1000);
    await settle();

    assert.equal(clock.calls().length, afterLaunch, "no raise left on the wheel");

    // Another script's listener, after the clock's, cancelling the launch.
    let cancelling = true;
    globalThis.mainWindow.on("prelaunch", ev => { if (cancelling) ev.preventDefault(); });
    fake.playGame(TABLE);
    assert.equal(fake.launches().length, 1, "the second launch was cancelled");
    await settle();
    assert.equal(clock.isVisible(), false, "gone with the cancelled launch");
    const afterCancel = clock.calls().length;
    fake.advanceTime(10 * 60 * 1000);
    assert.equal(clock.calls().length, afterCancel, "no raise left on the wheel");

    cancelling = false;
    fake.playGame(TABLE);
    await settle();
    assert.equal(clock.isVisible(), true, "a launch going ahead keeps it");
    assertNoErrorLogged(fake);
});
