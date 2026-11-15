// ============================================================
// The Wheel Position through main.js: shown under a menu, hidden from
// "gamestarted" to "wheelmode", even when the wheel moves meanwhile, and
// none on an empty wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownPosition, positionLayers } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";

test("the Wheel Position hides during a game and on an empty wheel", async () => {
    const { fake, chooseInFilterPicker } = await startWheelGuides();
    fake.moveWheel(1);
    assert.equal(shownPosition(fake), "2/5");

    fake.openMainMenu();
    assert.equal(shownPosition(fake), "2/5", "under a menu");
    fake.closeMenu();
    await settle();

    const game = fake.getCurrentTable();
    fake.gameStarted(game);
    assert.equal(shownPosition(fake), null, "hidden during the game");
    assert.deepEqual(layersBreakingTheRule(fake, positionLayers(fake)), []);
    fake.advanceTime(300);
    await settle();
    assert.equal(shownPosition(fake), null, "still hidden after the delayed reads");

    fake.gameOver(game);
    await settle();
    assert.equal(shownPosition(fake), "2/5", "back on the wheel");

    for (const favorite of ["Addams Family", "Cyclone", "Eight Ball"]) fake.getGameInfo(favorite).update({ isFavorite: false });
    await chooseInFilterPicker("Favorites");
    assert.equal(fake.getCurrentTable(), null);
    assert.equal(shownPosition(fake), null, "none on an empty wheel");
    assertNoErrorLogged(fake);
});
