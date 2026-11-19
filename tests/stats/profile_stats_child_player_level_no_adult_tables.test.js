// ============================================================
// A Child Profile's Player Level on the drawn Profile Stats' card, through
// main.js on the fake PinballY globals, in a collection without Adult
// Tables: the scaling only makes up for Night Owl and Full Moon Night, less
// the Young Players Achievements only a child has.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { start, MEDIEVAL, MARS, KEPT_FROM_CHILD_POINTS, CHILD_ONLY_POINTS } from "../levels/child_player_level_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("without Adult Tables, the scaling only makes up for Night Owl and Full Moon Night, less Young Players", async () => {
    const { fake, levelOf, worthOf, pointsOf } = await start([MEDIEVAL, MARS]);

    const adultWorth = worthOf("Alice");
    const childWorth = adultWorth - KEPT_FROM_CHILD_POINTS + CHILD_ONLY_POINTS;
    assert.equal(worthOf("Kid"), childWorth);
    assert.equal(pointsOf(levelOf("Kid")), Math.floor(50 * adultWorth / childWorth));
    assert.deepEqual(levelOf("Alice"), { level: "2", current: "50 / 125 points pour le niveau 3" });

    assertNoErrorLogged(fake);
});
