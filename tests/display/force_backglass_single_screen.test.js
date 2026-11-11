// ============================================================
// Force Backglass on a single screen, through main.js on the fake PinballY
// globals: with no second monitor for the backglass, the Add-on hides the
// backglass window at startup and after a game, since PinballY reopens it
// from its own saved setting and it then covers the whole playfield.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };

test("on a single screen the backglass window is hidden at startup and after a game", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 29, 10, 0, 0), tables: [TABLE], monitorCount: 1 });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "forceBackglass";
    // The owner's choice, from a session with the backglass screen on.
    fake.settings.set("BackglassWindow.Visible", true);

    await import("../../main.js");
    await settle();
    assert.deepEqual(fake.backglassShowCalls(), [false], "hidden at startup");
    assert.equal(fake.settings.getBool("BackglassWindow.Visible", true), true,
        "the owner's choice is kept: a backglass screen seen late by Windows gets it back next time");
    assert.ok(fake.logLines().some(line => line.startsWith("[ForceBackglass]") && line.includes("1 monitor")),
        "the hiding is logged, with the monitor count");
    fake.gameStarted(TABLE);
    fake.gameOver(TABLE);
    await settle();

    assert.ok(fake.backglassShowCalls().length > 1, "hidden again after the game");
    assert.ok(fake.backglassShowCalls().every(visible => visible === false), "never shown");
    assertNoErrorLogged(fake);
});
