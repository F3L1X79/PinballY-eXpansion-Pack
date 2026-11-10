// ============================================================
// The Rocket never replaces a launch the pack starts itself (Random Game, a
// table a screen offers) nor a capture: those launch as usual, and the
// player's own launch from the wheel still turns into the game afterwards.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { createPinballYHost } from "../../common/core/pinbally_host.js";
import { launchShownTable } from "../../common/tables/table_launch.js";
import { startRocketScenario, launchFromWheel, isRocketShown, BACKDROP_PAINT_MS } from "./rocket_scenario.js";

test("a launch started by the pack and a capture are never replaced; the player's launch is", async () => {
    const { fake, table } = await startRocketScenario();
    const playThrough = async () => {
        fake.gameStarted(table);
        fake.gameOver(table);
        await settle();
        fake.advanceTime(10000);
    };

    // As a Period Table, the Welcome Screen's Challenge Table or Random Game do.
    launchShownTable(createPinballYHost(), table);
    assert.equal(fake.launches().length, 1, "a table a screen offers launches");
    await playThrough();

    // From PinballY's own capture menu, not through the pack.
    globalThis.mainWindow.playGame(table, { command: fake.getBuiltInCommand("CaptureGo") });
    assert.equal(fake.launches().length, 2, "a capture launches");
    await playThrough();

    launchFromWheel(fake, table);
    assert.equal(fake.launches().length, 2, "the player's launch turns into the game");
    await settle();
    fake.advanceTime(BACKDROP_PAINT_MS);
    assert.ok(isRocketShown(fake));
    assertNoErrorLogged(fake);
});
