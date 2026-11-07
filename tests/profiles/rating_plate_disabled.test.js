// ============================================================
// With the Profile Ratings Add-on off, no Rating Plate, through main.js on
// the fake PinballY globals: none drawn, with Table Mastery on and a rated
// table selected, nor after a rating.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, plateLayers, rate, DRAWN_AHEAD_MS, TABLES } from "./rating_plate_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const [MEDIEVAL] = TABLES;

test("no Rating Plate with the Profile Ratings Add-on off, whatever Table Mastery does", async () => {
    const fake = await startScenario({ addOns: ["profilePicker", "tableMastery"], ratings: { Alice: { [MEDIEVAL.configId]: 4 } }, active: "Alice" });
    fake.advanceTime(DRAWN_AHEAD_MS);
    rate(fake, MEDIEVAL, 2);
    assert.deepEqual(plateLayers(fake), []);
    assertNoErrorLogged(fake);
});
