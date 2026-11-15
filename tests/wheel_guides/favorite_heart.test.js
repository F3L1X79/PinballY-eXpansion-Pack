// ============================================================
// The Favorite Heart through main.js: red on a Favorite Table, grey
// otherwise, following "gameselect" and the Attract Order's moves, which
// fire no "gameselect". Two layers drawn once, never redrawn on a move.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownHeart, heartLayers } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";

const KEPT_SECONDS = 10;
const STEP_MS = KEPT_SECONDS * 1000;

test("the Favorite Heart is red on a Favorite Table, grey otherwise", async () => {
    const { fake } = await startWheelGuides({
        settings: { attractOrder: "inOrder" }, cabinet: { attractOrderSwitchTime: KEPT_SECONDS },
        pinballYSettings: { "AttractMode.SwitchTime": 86400 },
    });
    assert.equal(fake.getCurrentTable().title, "Addams Family");
    assert.equal(shownHeart(fake), "red");

    fake.moveWheel(1);
    assert.equal(shownHeart(fake), "grey", "Black Knight is no favourite");
    fake.moveWheel(1);
    assert.equal(shownHeart(fake), "red", "Cyclone is one");
    const heartDraws = fake.drawings().filter(drawing => drawing.images.some(image => image.includes("favorite_heart")));
    assert.equal(heartDraws.length, 2, "each heart drawn once");
    assert.deepEqual(layersBreakingTheRule(fake, heartLayers(fake)), []);

    fake.enterAttractMode();
    await settle();
    assert.equal(shownHeart(fake), null, "hidden in attract mode");
    fake.advanceTime(STEP_MS);
    assert.equal(fake.getCurrentTable().title, "Dracula");
    assert.equal(shownHeart(fake), null, "still hidden after a move");
    fake.exitAttractMode();
    assert.equal(shownHeart(fake), "grey", "back on the table attract mode ended on");
    assertNoErrorLogged(fake);
});
