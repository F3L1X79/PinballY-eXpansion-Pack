// ============================================================
// Another Profile's Profile Stats from its Household Stats column: its own
// values, read-only (no foot buttons nor Avatar choice, Exit alone); Exit goes back to the
// Household Stats on that column, then to one's own Profile Stats.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold, errorLines, played, HOUR, MEDIEVAL, THEATRE } from "./household_stats_scenario.js";
import { cardTexts, isReadOnly, section, highlighted, buttonHints, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "./profile_stats_reader.js";
import { expectedButtonHints } from "../support/button_hints_reader.js";
import { openHouseholdStats, chooseColumn, highlightedColumn, isHouseholdStatsOpen, press } from "./household_stats_reader.js";

test("Select on another Profile's column opens its Profile Stats, read-only", async () => {
    const { fake, lang } = await startHousehold({
        profiles: {
            Alice: { plays: { [MEDIEVAL.configId]: played(2, HOUR) } },
            Bob: { plays: { [THEATRE.configId]: played(5, 2 * HOUR) } },
        },
        active: "Alice",
    });
    const TEXT = lang.profileStats;
    openHouseholdStats(fake, lang);

    const select = chooseColumn(fake, "Bob");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.ok(select.defaultPrevented, "Select never reaches the wheel");
    assert.ok(!isHouseholdStatsOpen(fake));
    assert.ok(isProfileStatsOpen(fake));
    assert.equal(cardTexts(fake)[0], "Bob");
    assert.deepEqual(section(fake, TEXT.sections.game, TEXT.stats)[TEXT.stats.gamesPlayed], ["5"]);
    assert.ok(isReadOnly(fake), "no button at the card's foot");
    assert.equal(highlighted(fake), lang.buttonHints.back, "only the Exit Button, which goes back");
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { flippers: null, select: false, exit: "back" }));
    press(fake, "Next");
    assert.equal(highlighted(fake), lang.buttonHints.back, "no Avatar to change on another Profile's card");

    const exit = press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.ok(exit.defaultPrevented);
    assert.ok(!isProfileStatsOpen(fake));
    assert.ok(isHouseholdStatsOpen(fake), "back to the Household Stats");
    assert.equal(highlightedColumn(fake), "Bob", "on that column");

    // Select on the Exit Button goes back the same way.
    chooseColumn(fake, "Bob");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    press(fake, "Select");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.ok(isHouseholdStatsOpen(fake));
    assert.equal(highlightedColumn(fake), "Bob");

    press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.ok(!isHouseholdStatsOpen(fake));
    assert.ok(isProfileStatsOpen(fake));
    assert.equal(cardTexts(fake)[0], "Alice", "one's own Profile Stats");
    assert.equal(highlighted(fake), "Household Stats");
    assert.deepEqual(errorLines(fake), []);
});
