// ============================================================
// Where the Rating Plate sits, through main.js on the fake PinballY globals
// with the Profile Picker, the Challenges and Table Mastery on: on top of
// the stack under the badge, then the Challenge Card, then the Mastery Bar,
// their panels 24 px apart, the plate's left edge on the card's; in a week
// with no Challenge, the bar right under the plate.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, stackTops, stackPanels, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const BADGE = 170;
const GAP = 24;
const NO_CHALLENGE = { week: "2026-09-21", template: "", param: null, target: 0 };
const NEXT_MONDAY = new Date(2026, 8, 28, 20, 0, 0);
const [MEDIEVAL, MARS] = TABLES;

const gapsOf = panels => panels.slice(1).map((panel, i) => panel.top - panels[i].bottom);

test("the Rating Plate tops the stack under the badge, above the Challenge Card and the Mastery Bar, 24 px apart", async () => {
    const fake = await startScenario({
        addOns: ["profilePicker", "challenges", "tableMastery", "profileRatings"],
        ratings: { Alice: { [MEDIEVAL.configId]: 4 } }, active: "Alice", challenge: NO_CHALLENGE,
    });
    const quiet = stackTops(fake);
    assert.equal(quiet.plate, BADGE, "right under the badge");
    assert.equal(quiet.card, null, "no Challenge Card this week");
    assert.deepEqual(gapsOf(stackPanels(fake)), [GAP], "the bar right under the plate");

    fake.setNow(NEXT_MONDAY);
    fake.fire("wheelmode");
    const panels = stackPanels(fake);
    assert.equal(stackTops(fake).plate, BADGE, "the plate stays put");
    assert.equal(panels.length, 3, "plate, card and bar");
    assert.deepEqual(gapsOf(panels), [GAP, GAP]);
    assert.equal(panels[0].left, panels[1].left, "the plate's left edge on the card's");

    const tops = stackTops(fake);
    fake.moveWheel(TABLES.indexOf(MARS));
    assert.deepEqual(stackTops(fake), tops, "an unrated table moves nothing");
    assertNoErrorLogged(fake);
});
