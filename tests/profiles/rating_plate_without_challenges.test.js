// ============================================================
// With the Challenges off, the Rating Plate takes the Challenge Card's
// place, through main.js on the fake PinballY globals: right under the
// Profile badge, the Mastery Bar's panel 24 px under its own.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, stackTops, stackPanels, shownRating, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const BADGE = 170;
const GAP = 24;
const [MEDIEVAL] = TABLES;

test("the Rating Plate takes the Challenge Card's place with the Challenges off", async () => {
    const fake = await startScenario({
        addOns: ["profilePicker", "tableMastery", "profileRatings"], ratings: { Alice: { [MEDIEVAL.configId]: 2.5 } }, active: "Alice",
    });
    assert.equal(shownRating(fake), 2.5);
    const tops = stackTops(fake);
    assert.equal(tops.plate, BADGE);
    assert.equal(tops.card, null);
    const [plate, bar] = stackPanels(fake);
    assert.equal(bar.top - plate.bottom, GAP);
    assertNoErrorLogged(fake);
});
