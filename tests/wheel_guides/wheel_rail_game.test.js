// ============================================================
// The Wheel Rail through main.js: shown under a menu, hidden from
// "gamestarted" to "wheelmode", even after the delayed reads, and none on
// an empty wheel; its hidden layers are points.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, railBaseLayers, railPillLayers } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";

const railLayers = fake => [...railBaseLayers(fake), ...railPillLayers(fake)];

test("the Wheel Rail hides during a game and on an empty wheel", async () => {
    const { fake, chooseInFilterPicker } = await startWheelGuides();
    fake.moveWheel(1);
    assert.equal(shownRail(fake).pill, "B");

    fake.openMainMenu();
    assert.equal(shownRail(fake).pill, "B", "under a menu");
    fake.closeMenu();
    await settle();

    const game = fake.getCurrentTable();
    fake.gameStarted(game);
    assert.equal(shownRail(fake), null, "hidden during the game");
    assert.deepEqual(layersBreakingTheRule(fake, railLayers(fake)), []);
    fake.advanceTime(300);
    await settle();
    assert.equal(shownRail(fake), null, "still hidden after the delayed reads");

    fake.gameOver(game);
    await settle();
    assert.equal(shownRail(fake).pill, "B", "back on the wheel");

    for (const favorite of ["Addams Family", "Cyclone", "Eight Ball"]) fake.getGameInfo(favorite).update({ isFavorite: false });
    await chooseInFilterPicker("Favorites");
    assert.equal(fake.getCurrentTable(), null);
    assert.equal(shownRail(fake), null, "none on an empty wheel");
    assert.deepEqual(layersBreakingTheRule(fake, railLayers(fake)), []);
    assertNoErrorLogged(fake);
});
