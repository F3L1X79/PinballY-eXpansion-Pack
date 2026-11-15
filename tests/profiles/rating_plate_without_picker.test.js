// ============================================================
// Without the Profile Picker, the same stack starts at the top of the
// window, through main.js on the fake PinballY globals: the Rating Plate,
// then the Challenge Card, then the Mastery Bar, their panels 24 px apart.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, stackTops, stackPanels, shownRating, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const GAP = 24;
const [MEDIEVAL] = TABLES;

test("without the Profile Picker, the Rating Plate tops the stack at the top of the window", async () => {
    const fake = await startScenario({
        addOns: ["challenges", "tableMastery", "profileRatings"], ratings: { guest: { [MEDIEVAL.configId]: 5 } },
    });
    assert.equal(shownRating(fake), 5);
    assert.equal(stackTops(fake).plate, 0);
    const panels = stackPanels(fake);
    assert.equal(panels.length, 3, "plate, card and bar");
    assert.deepEqual(panels.slice(1).map((panel, i) => panel.top - panels[i].bottom), [GAP, GAP]);
    assert.equal(panels[0].left, panels[1].left, "the plate's left edge on the card's");
    assertNoErrorLogged(fake);
});
