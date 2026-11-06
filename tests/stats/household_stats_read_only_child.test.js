// ============================================================
// A Child Profile looking at an adult's Profile Stats from the Household
// Stats, through main.js on the fake PinballY globals: the adult's tastes
// strip shows its Adult Table as it is (looking is not picking a table);
// looking writes nothing of the adult's.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold, errorLines, played, PROFILES, HOUR, MEDIEVAL, PLAYBOY } from "./household_stats_scenario.js";
import { section, PROFILE_STATS_OPEN_MS } from "./profile_stats_reader.js";
import { openHouseholdStats, chooseColumn } from "./household_stats_reader.js";

const DAD_FILE = `${PROFILES}\\Dad\\profile.json`;

test("a Child Profile sees an adult's Adult Table, and looking writes nothing", async () => {
    const { fake, lang } = await startHousehold({
        profiles: {
            Dad: { plays: { [PLAYBOY.configId]: played(3, 2 * HOUR), [MEDIEVAL.configId]: played(1, 600) }, playLog: ["2026-09-01T21:00:00"] },
            Kid: { isChild: true, plays: { [MEDIEVAL.configId]: played(1, 600) } },
        },
        active: "Kid",
        hasAdultTable: true,
    });
    const TEXT = lang.profileStats;
    const dadBefore = fake.readFile(DAD_FILE);
    openHouseholdStats(fake, lang);
    chooseColumn(fake, "Dad");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);

    const tastes = section(fake, TEXT.sections.tastes, TEXT.stats);
    assert.equal(tastes[TEXT.stats.favouriteTable][0], "Playboy", "the adult's favourite, an Adult Table");
    assert.equal(tastes[TEXT.stats.favouriteManufacturer][0], "Stern");

    assert.equal(fake.readFile(DAD_FILE), dadBefore, "Dad's profile.json unchanged");
    assert.deepEqual(errorLines(fake), []);
});
