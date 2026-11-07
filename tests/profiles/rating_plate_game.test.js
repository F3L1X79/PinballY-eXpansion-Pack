// ============================================================
// The Rating Plate during a game, through main.js on the fake PinballY
// globals with Table Mastery on: hidden while the game runs, back on the
// wheel afterwards, unchanged in value and place while the Mastery Bar
// lights up after the Play.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownRating, shownTop, plateLayers, TABLES } from "./rating_plate_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { MASTERY_BAR_Z_INDEX } from "../../common/mastery/mastery_bar.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const [MEDIEVAL] = TABLES;
const MINUTE_MS = 60 * 1000;
const isBarLit = fake => fake.drawingLayers().some(layer => layer.zIndex === MASTERY_BAR_Z_INDEX.lit && layer.alpha > 0);
const shownPlate = fake => plateLayers(fake).find(layer => layer.alpha > 0);

test("the Rating Plate hides during a game, comes back on the wheel, and stays still while the Mastery Bar is lit", async () => {
    const fake = await startScenario({ addOns: ["tableMastery", "profileRatings"], ratings: { guest: { [MEDIEVAL.configId]: 3 } } });
    const plateBefore = shownPlate(fake);
    const topBefore = shownTop(fake);
    assert.equal(shownRating(fake), 3);

    fake.playGame(MEDIEVAL);
    fake.gameStarted(MEDIEVAL);
    await settle();
    assert.equal(shownRating(fake), null, "hidden while the game runs");
    fake.advanceTime(MINUTE_MS);
    fake.gameOver(MEDIEVAL);
    await settle();

    assert.ok(isBarLit(fake), "the Play moved the Mastery Bar, now lit");
    assert.equal(shownRating(fake), 3, "back on the wheel");
    assert.equal(shownPlate(fake), plateBefore, "the same layer: no lit state");
    assert.equal(shownTop(fake), topBefore, "in the same place");
    assertNoErrorLogged(fake);
});
