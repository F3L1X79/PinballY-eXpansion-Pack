// ============================================================
// The Maneki-neko's earliest move, on the left edge: only the player's wheel
// moves in wheel mode count, neither the pack's own nor attract mode's.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startManekiScenario, moveWheelTimes, catLayers, shownCat, LEFT_IMAGE, OUT_MS } from "./maneki_neko_scenario.js";

const NEAR = 0.002;
// 0.02: 216 + 0.02 x 379.2 px down, for a side of 268.8 px on 1920 x 1080.
const OUT_X = -0.43;
const OUT_Y = 0.16853;

test("the 5th move of the player brings the cat out of the left edge, other moves not counting", async () => {
    const { fake } = await startManekiScenario({ random: () => 0.02 });

    fake.setWheelGame(1);
    fake.setWheelGame(-1);
    fake.enterAttractMode();
    moveWheelTimes(fake, 6);
    fake.exitAttractMode();
    assert.deepEqual(catLayers(fake), [], "attract mode and the pack's own moves do not count");

    moveWheelTimes(fake, 4);
    assert.deepEqual(catLayers(fake), [], "not at the 4th");
    moveWheelTimes(fake, 1);

    fake.advanceTime(OUT_MS + 16);
    const cat = shownCat(fake);
    assert.deepEqual(cat.images(), [LEFT_IMAGE]);
    assert.ok(Math.abs(cat.position().x - OUT_X) < NEAR, `its cut against the edge: ${cat.position().x}`);
    assert.ok(Math.abs(cat.position().y - OUT_Y) < NEAR, `high in the central 60 %: ${cat.position().y}`);
    assertNoErrorLogged(fake);
});
