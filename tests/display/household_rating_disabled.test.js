// ============================================================
// Profile Ratings off, through main.js on the fake PinballY globals: the
// lower status line keeps its four table messages, with no Household
// Rating, since PinballY's Ratings are shared again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, MEDIEVAL, MEDIEVAL_POSITION } from "./household_rating_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with Profile Ratings off, the lower status line has no Household Rating", async () => {
    const { fake, TEXT } = await startScenario({
        ratings: { Alice: { [MEDIEVAL.configId]: 4 }, Bob: { [MEDIEVAL.configId]: 2 } },
        active: "Alice",
        addOns: ["statusLineInfo", "profilePicker"],
    });

    assert.deepEqual(fake.lowerStatusLine(), [
        TEXT.year(MEDIEVAL_POSITION), TEXT.manufacturer(MEDIEVAL_POSITION),
        TEXT.playCount(MEDIEVAL_POSITION, 0), TEXT.playTime(MEDIEVAL_POSITION, 0, 0),
    ]);
    assertNoErrorLogged(fake);
});
