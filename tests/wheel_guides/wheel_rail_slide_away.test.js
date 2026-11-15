// ============================================================
// The Wheel Rail through main.js slides away 3 s after the last change of
// selected table, base and pill together, fading out; the next change brings
// it back in place with a fast fade-in, even during the slide. Nothing is
// drawn for the motion; the Wheel Position and the Favorite Heart stay.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, shownPosition, shownHeart, railBaseLayers, railPillLayers, railLayers, railDraws } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// The rail's place in its window when it shows: 0.8 % of the width from the right edge.
const IN_PLACE_X = -0.008;
// The shown base and pill: their x and alpha.
function railLook(fake) {
    const [base] = railBaseLayers(fake).filter(layer => layer.alpha > 0);
    const [pill] = railPillLayers(fake).filter(layer => layer.alpha > 0);
    const look = layer => layer === undefined ? null : { x: layer.position().x, alpha: layer.alpha };
    return { base: look(base), pill: look(pill) };
}

test("the Wheel Rail slides away after 3 s without a move and comes back on the next one", async () => {
    const { fake } = await startWheelGuides();
    // Every pill drawn ahead, so that nothing below needs a draw.
    fake.advanceTime(10000);
    const draws = railDraws(fake);
    assert.equal(shownRail(fake), null, "gone 3 s after startup");
    assert.deepEqual(layersBreakingTheRule(fake, railLayers(fake)), []);
    assert.equal(shownPosition(fake), "1/5", "the Wheel Position stays");
    assert.equal(shownHeart(fake), "red", "the Favorite Heart stays");

    fake.moveWheel(1);
    assert.equal(shownRail(fake).pill, "B", "back at once on a move");
    assert.equal(railLook(fake).base.x, IN_PLACE_X, "in place, no slide");
    fake.advanceTime(100);
    assert.deepEqual(railLook(fake), { base: { x: IN_PLACE_X, alpha: 1 }, pill: { x: IN_PLACE_X, alpha: 1 } }, "faded in within 100 ms");

    fake.advanceTime(2800);
    fake.moveWheel(1);
    fake.advanceTime(2900);
    assert.deepEqual(railLook(fake).base, { x: IN_PLACE_X, alpha: 1 }, "a move restarts the 3 s");

    fake.advanceTime(300);
    const leaving = railLook(fake);
    assert.ok(leaving.base.alpha > 0 && leaving.base.alpha < 1, `fading out, alpha ${leaving.base.alpha}`);
    assert.ok(leaving.base.x > IN_PLACE_X, `sliding right, x ${leaving.base.x}`);
    assert.deepEqual(leaving.pill, leaving.base, "the pill slides with the base");
    fake.advanceTime(500);
    assert.equal(shownRail(fake), null, "gone after the slide");
    assert.deepEqual(layersBreakingTheRule(fake, railLayers(fake)), []);

    // A move during the slide: back in place, from the opacity it had.
    fake.moveWheel(1);
    fake.advanceTime(3200);
    const before = railLook(fake).base.alpha;
    assert.ok(before < 1);
    fake.moveWheel(-1);
    assert.equal(shownRail(fake).pill, "C");
    const back = railLook(fake);
    assert.equal(back.base.x, IN_PLACE_X, "back in place at once");
    assert.ok(back.base.alpha >= before, `no flash: ${back.base.alpha} from ${before}`);
    fake.advanceTime(100);
    assert.equal(railLook(fake).base.alpha, 1);

    // The 3 s run on under a menu: the rail is gone when it closes.
    fake.openMainMenu();
    fake.advanceTime(4000);
    fake.closeMenu();
    await settle();
    fake.advanceTime(300);
    await settle();
    assert.equal(fake.getCurrentTable().title, "Cyclone");
    assert.equal(shownRail(fake), null, "gone after the menu, the table unchanged");

    assert.deepEqual(railDraws(fake), draws, "the motion draws nothing");
    assertNoErrorLogged(fake);
});
