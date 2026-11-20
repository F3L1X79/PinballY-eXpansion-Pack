// ============================================================
// The Rating Plate follows a rating at once, through main.js on the fake
// PinballY globals: the "rate game" dialog closing shows the new Rating,
// with no other "gameselect"; a first Rating, 0 stars included, brings the
// yellow edge, and another popup closing changes nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownRating, shownAsRated, rate, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const [MEDIEVAL] = TABLES;

test("rating the selected table changes the Rating Plate as soon as PinballY's dialog closes", async () => {
    const fake = await startScenario();
    assert.equal(shownRating(fake), 0, "not rated yet: empty stars");
    assert.equal(shownAsRated(fake), false, "not rated yet: no edge");

    rate(fake, MEDIEVAL, 0);
    assert.equal(shownRating(fake), 0, "0 stars: the stars stay empty");
    assert.equal(shownAsRated(fake), true, "0 stars: the edge shows at once");
    rate(fake, MEDIEVAL, 4.5);
    assert.equal(shownRating(fake), 4.5, "a Rating fills the stars");
    rate(fake, MEDIEVAL, 1);
    assert.equal(shownRating(fake), 1);

    fake.getGameInfo(MEDIEVAL.configId).update({ rating: 2 });
    fake.fire("popupclose", { id: "game info" });
    assert.equal(shownRating(fake), 1, "another popup closing is not the cue");
    assertNoErrorLogged(fake);
});
