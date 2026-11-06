// ============================================================
// The Mastery Bar keeps the hidden layer rule, through main.js on the fake
// PinballY globals: drawn ahead, every state waiting is a point; resting,
// lit, hidden during a game and back on the wheel, no hidden layer of its
// own is more than a point and the shown ones keep their usual size and place.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, masteryLayers, shownMastery, isLit, play, DRAWN_AHEAD_MS, LIT_MS, TABLES } from "./mastery_bar_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";

const [MEDIEVAL] = TABLES;
const MINUTE = 60;

const placesOfShown = fake => masteryLayers(fake).filter(layer => layer.alpha > 0)
    .map(layer => ({ scale: layer.scale(), position: layer.position() }));

function assertRuleHeld(fake, where) {
    assert.ok(masteryLayers(fake).length > 0, where);
    assert.deepEqual(layersBreakingTheRule(fake, masteryLayers(fake)), [], where);
}

test("the Mastery Bar's hidden layers are points, and its shown ones keep their usual size and place", async () => {
    const fake = await startScenario();
    fake.advanceTime(DRAWN_AHEAD_MS);
    assert.equal(shownMastery(fake).head, "To discover");
    assertRuleHeld(fake, "drawn ahead, resting");
    const [usualPlace] = placesOfShown(fake);

    await play(fake, MEDIEVAL, 30 * MINUTE, { watchLight: true });
    assert.ok(isLit(fake), "lit after a Play that moved it");
    assertRuleHeld(fake, "lit");
    fake.advanceTime(LIT_MS);
    assert.ok(!isLit(fake));
    assertRuleHeld(fake, "resting again");

    fake.gameStarted(MEDIEVAL);
    assert.equal(shownMastery(fake), null);
    assertRuleHeld(fake, "hidden during a game");
    fake.gameOver(MEDIEVAL);
    assert.ok(shownMastery(fake));
    assertRuleHeld(fake, "back on the wheel");
    const placesBack = placesOfShown(fake);
    assert.deepEqual(placesBack, placesBack.map(() => usualPlace), "every shown layer at the usual size and place");
    assertNoErrorLogged(fake);
});
