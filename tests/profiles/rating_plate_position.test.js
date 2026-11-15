// ============================================================
// Where the Rating Plate sits, through main.js on the fake PinballY globals
// with the Profile Picker, the Challenges and Table Mastery on: beside the
// badge, its panel 24 px above the Challenge Card's, the card right under
// the badge and the Mastery Bar under it, its left edge on the card's; in a
// week with no Challenge, the bar right under the badge.
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

test("the Rating Plate rises beside the badge, above the Challenge Card and the Mastery Bar, 24 px apart", async () => {
    const fake = await startScenario({
        addOns: ["profilePicker", "challenges", "tableMastery", "profileRatings"],
        ratings: { Alice: { [MEDIEVAL.configId]: 4 } }, active: "Alice", challenge: NO_CHALLENGE,
    });
    const quiet = stackTops(fake);
    assert.ok(quiet.plate < BADGE, "beside the badge");
    assert.equal(quiet.card, null, "no Challenge Card this week");
    assert.equal(quiet.bar, BADGE, "the bar right under the badge: no gap");

    fake.setNow(NEXT_MONDAY);
    fake.fire("wheelmode");
    const tops = stackTops(fake);
    assert.equal(tops.plate, quiet.plate, "the plate stays put");
    assert.equal(tops.card, BADGE, "the card right under the badge");
    const panels = stackPanels(fake);
    assert.equal(panels.length, 3, "plate, card and bar");
    assert.deepEqual(gapsOf(panels), [GAP, GAP]);
    assert.equal(panels[0].left, panels[1].left, "the plate's left edge on the card's");

    fake.moveWheel(TABLES.indexOf(MARS));
    assert.deepEqual(stackTops(fake), tops, "an unrated table moves nothing");
    assertNoErrorLogged(fake);
});
