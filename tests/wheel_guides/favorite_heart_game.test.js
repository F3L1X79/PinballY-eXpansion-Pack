// ============================================================
// The Favorite Heart through main.js: shown under a menu, hidden from
// "gamestarted" to "wheelmode", and none on an empty wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownHeart, heartLayers } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";

test("the Favorite Heart hides during a game and on an empty wheel", async () => {
    const { fake, chooseInFilterPicker } = await startWheelGuides();
    fake.openMainMenu();
    assert.equal(shownHeart(fake), "red", "under a menu");
    fake.closeMenu();
    await settle();

    const game = fake.getCurrentTable();
    fake.gameStarted(game);
    assert.equal(shownHeart(fake), null, "hidden during the game");
    assert.deepEqual(layersBreakingTheRule(fake, heartLayers(fake)), []);
    fake.advanceTime(300);
    await settle();
    assert.equal(shownHeart(fake), null, "still hidden after the delayed reads");

    fake.gameOver(game);
    await settle();
    assert.equal(shownHeart(fake), "red", "back on the wheel");

    for (const favorite of ["Addams Family", "Cyclone", "Eight Ball"]) fake.getGameInfo(favorite).update({ isFavorite: false });
    await chooseInFilterPicker("Favorites");
    assert.equal(fake.getCurrentTable(), null);
    assert.equal(shownHeart(fake), null, "none on an empty wheel");
    assertNoErrorLogged(fake);
});
