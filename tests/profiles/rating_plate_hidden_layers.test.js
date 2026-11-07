// ============================================================
// The Rating Plate keeps the hidden layer rule, through main.js on the
// fake PinballY globals: one layer per Rating from 0 to 5 in half steps,
// drawn ahead; shown, hidden during a game and back on the wheel, no
// hidden one is more than a point.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, plateLayers, shownRating, select, DRAWN_AHEAD_MS, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";

const [MEDIEVAL, MARS] = TABLES;
const RATING_COUNT = 11;

function assertRuleHeld(fake, where) {
    assert.deepEqual(layersBreakingTheRule(fake, plateLayers(fake)), [], where);
}

test("the Rating Plate's layers are drawn ahead, one per Rating, and the hidden ones are points", async () => {
    const fake = await startScenario({ ratings: { guest: { [MEDIEVAL.configId]: 0.5 } } });
    fake.advanceTime(DRAWN_AHEAD_MS);
    assert.equal(plateLayers(fake).length, RATING_COUNT, "every Rating drawn ahead, once");
    assert.equal(shownRating(fake), 0.5);
    assertRuleHeld(fake, "drawn ahead, shown");

    select(fake, MARS);
    assert.equal(shownRating(fake), null);
    assertRuleHeld(fake, "unrated table");

    select(fake, MEDIEVAL);
    fake.gameStarted(MEDIEVAL);
    assert.equal(shownRating(fake), null);
    assertRuleHeld(fake, "hidden during a game");
    fake.gameOver(MEDIEVAL);
    assert.equal(shownRating(fake), 0.5);
    assertRuleHeld(fake, "back on the wheel");
    assert.equal(plateLayers(fake).length, RATING_COUNT, "no layer drawn again");
    assertNoErrorLogged(fake);
});
