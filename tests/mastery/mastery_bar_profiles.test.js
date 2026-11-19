// ============================================================
// Each Profile has its own Table Mastery, through main.js on the fake
// PinballY globals: a Profile switch shows the new Profile's Mastery Level
// of the selected table at once, Guest and a Child Profile included.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownMastery, play, select, errorLines, playedFor, TABLES, MINUTE, HOUR } from "./mastery_bar_scenario.js";

const [FIRST, SECOND] = TABLES;

test("a Profile switch shows the new Profile's Mastery Levels, Guest and a Child Profile included", async () => {
    const fake = await startScenario({
        addOns: ["profilePicker", "tableMastery"],
        active: "Alice",
        profiles: {
            Alice: { plays: { [FIRST.configId]: playedFor(3 * HOUR) } },
            Kid: { isChild: true, plays: { [SECOND.configId]: playedFor(HOUR) } },
        },
    });
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const store = getProfileStore();
    assert.deepEqual(shownMastery(fake), { head: "Specialist", number: "5", fill: 0.5 });

    store.switchTo("Kid");
    assert.deepEqual(shownMastery(fake), { head: "Discover", number: null, fill: 0 }, "Kid never played it");
    select(fake, SECOND);
    assert.deepEqual(shownMastery(fake), { head: "Regular", number: "3", fill: 0 });

    store.switchTo("guest");
    assert.equal(shownMastery(fake).head, "Discover");
    await play(fake, SECOND, MINUTE);
    assert.deepEqual(shownMastery(fake), { head: "Rookie", number: "1", fill: 0 }, "Guest's own first Play");

    store.switchTo("Kid");
    assert.equal(shownMastery(fake).head, "Regular", "Guest's Play is not Kid's");

    assert.deepEqual(errorLines(fake), []);
});
