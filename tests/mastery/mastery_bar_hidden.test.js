// ============================================================
// The Mastery Bar, through main.js on the fake PinballY globals, never
// shows over a game, comes back on the wheel, and shows nothing when the
// wheel selection is empty.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownMastery, errorLines, TABLES } from "./mastery_bar_scenario.js";

const [, FAVOURITE, OLD_HAND] = TABLES;

test("the Mastery Bar hides while a game runs and with an empty wheel selection", async () => {
    const fake = await startScenario();

    fake.gameStarted(FAVOURITE);
    assert.equal(shownMastery(fake), null, "hidden while a game runs");
    fake.fire("gameselect", { game: OLD_HAND });
    assert.equal(shownMastery(fake), null, "still hidden when the wheel moves during the game");
    fake.gameOver(FAVOURITE);
    assert.equal(shownMastery(fake).head, "Discover", "back on the wheel");

    fake.setWheelTables([]);
    fake.fire("gameselect", { game: null });
    assert.equal(shownMastery(fake), null, "no table selected");
    fake.fire("wheelmode");
    assert.equal(shownMastery(fake), null);

    assert.deepEqual(errorLines(fake), []);
});
