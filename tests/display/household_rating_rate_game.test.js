// ============================================================
// The Household Rating follows a rating, through main.js on the fake PinballY
// globals: once PinballY's "rate game" dialog closes, the message counts the
// active Profile's new Rating, with no other "gameselect"; another popup
// closing changes nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, lastLowerMessage, rate, MEDIEVAL, MEDIEVAL_POSITION } from "./household_rating_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("rating the selected table changes the Household Rating as soon as PinballY's dialog closes", async () => {
    const { fake, TEXT } = await startScenario({
        ratings: { Alice: {}, Bob: { [MEDIEVAL.configId]: 4 } },
        active: "Alice",
    });
    assert.equal(lastLowerMessage(fake), TEXT.noRating(MEDIEVAL_POSITION));

    await rate(fake, MEDIEVAL, 2);
    assert.equal(lastLowerMessage(fake), TEXT.householdRating(MEDIEVAL_POSITION, 3, 2), "Alice's 2 counts");
    await rate(fake, MEDIEVAL, 5);
    assert.equal(lastLowerMessage(fake), TEXT.householdRating(MEDIEVAL_POSITION, 4.5, 2));

    fake.getGameInfo(MEDIEVAL.configId).update({ rating: 1 });
    fake.fire("popupclose", { id: "game info" });
    await settle();
    assert.equal(lastLowerMessage(fake), TEXT.householdRating(MEDIEVAL_POSITION, 4.5, 2), "another popup closing is not the cue");
    assertNoErrorLogged(fake);
});
