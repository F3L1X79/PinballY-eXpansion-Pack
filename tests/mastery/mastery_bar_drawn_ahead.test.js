// ============================================================
// The Mastery Bar drawn ahead (ADR 0010), through main.js on the fake
// PinballY globals: once the drawing ahead has run, moving the wheel only
// shows and hides layers, since each draw blocks PinballY.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startScenario, shownMastery, select, errorLines, playedFor, TABLES, HOUR, DRAWN_AHEAD_MS } from "./mastery_bar_scenario.js";

const [, FAVOURITE, OLD_HAND] = TABLES;

test("once drawn ahead, moving the wheel draws nothing", async () => {
    const fake = await startScenario({ profiles: { guest: { plays: { [OLD_HAND.configId]: playedFor(3 * HOUR) } } } });
    fake.advanceTime(DRAWN_AHEAD_MS);
    const drawingsBefore = fake.drawings().length;

    select(fake, OLD_HAND);
    assert.deepEqual(shownMastery(fake), { head: "Specialist", number: "5", fill: 0.5 });
    select(fake, FAVOURITE);
    assert.equal(shownMastery(fake).head, "Discover");

    assert.equal(fake.drawings().length, drawingsBefore);
    await settle();
    assert.deepEqual(errorLines(fake), []);
});
