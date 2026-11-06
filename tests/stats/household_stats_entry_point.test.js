// ============================================================
// The way into the Household Stats: the Profile Stats' "Household Stats"
// button shows from two Profiles, with their count; Exit goes back to the
// Profile Stats on that button, and Select opens them again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold, errorLines } from "./household_stats_scenario.js";
import { openProfileStats, buttons, highlighted, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "./profile_stats_reader.js";
import { openHouseholdStats, isHouseholdStatsOpen, householdStatsLayerCount, title, press } from "./household_stats_reader.js";

test("the Household button opens the Household Stats, Exit goes back to it", async () => {
    // Guest is active: without the Profile picker, it is at startup.
    const { fake, lang } = await startHousehold({ profiles: { Alice: {}, Bob: {} } });
    openProfileStats(fake, lang);
    const shownButtons = buttons(fake);
    assert.deepEqual(shownButtons.slice(0, 2).map(button => button.label), ["Avatar Frames", "Household Stats"], "right after the Frame button");
    assert.deepEqual(shownButtons[1], { label: "Household Stats", count: "2" }, "Guest seeing it too, Guest left out of its count");
    press(fake, "Exit");

    openHouseholdStats(fake, lang);
    assert.ok(isHouseholdStatsOpen(fake));
    assert.ok(!isProfileStatsOpen(fake));
    assert.equal(title(fake), "Household Stats");

    const exit = press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.ok(exit.defaultPrevented, "Exit never reaches the wheel");
    assert.equal(householdStatsLayerCount(fake), 0, "its layers are gone");
    assert.ok(isProfileStatsOpen(fake));
    assert.equal(highlighted(fake), "Household Stats");

    press(fake, "Select");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.ok(isHouseholdStatsOpen(fake), "opened again from its button");
    assert.deepEqual(errorLines(fake), []);
});
