// ============================================================
// With the Seamless Launch Overlay off, main.js poses no layer on the
// backglass window at any step of a launch, its closing included.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("no backglass layer at any step of a launch with the Seamless Launch Overlay off", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 6, 20, 0, 0), tables: [{ configId: "afm", title: "Attack from Mars" }] });
    const game = fake.getAllTables()[0];
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "forceBackglass";
    await import("../../main.js");
    await settle();
    const layerCounts = [];
    for (const eventName of ["launchoverlayshow", "launchoverlaymessage", "gameover", "launchoverlayhide"]) {
        fake.on(eventName, () => layerCounts.push(fake.backglassDrawingLayers().length));
    }

    fake.playGame(game);
    fake.gameStarted(game);
    fake.runCommand(fake.getBuiltInCommand("KillGame"));
    fake.gameOver(game);
    fake.playGame(game);
    fake.gameStarted(game, { capture: "single" });
    fake.gameOver(game);
    assert.ok(layerCounts.length > 0, "the launch steps were heard");
    assert.ok(layerCounts.every(count => count === 0), "no backglass layer");
    assert.equal(fake.backglassDrawingLayers().length, 0);
    assertNoErrorLogged(fake);
});
