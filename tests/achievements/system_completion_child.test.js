// ============================================================
// System Achievements of a Child Profile through main.js on the fake
// PinballY globals: on a cabinet with two Systems, a child who sees only one
// System's tables (the other's are all Adult Tables) has none; an adult
// Profile on the same cabinet has one per System.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startScenario, table, PROFILES_FOLDER } from "./achievement_progress_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const VPX = { displayName: "Visual Pinball X" };
const PINBALL_FX = { displayName: "Pinball FX" };

const TABLES = [
    { ...table(1, "Medieval Madness", "Williams", 1997, ["Fantasy"]), system: VPX },
    { ...table(2, "Twilight Zone", "Williams", 1993, ["Fantasy"]), system: VPX },
    { ...table(3, "Party Night", "Zen", 2021, ["NSFW"]), system: PINBALL_FX },
    { ...table(4, "Night Club", "Zen", 2022, ["NSFW"]), system: PINBALL_FX },
];

test("a Child Profile who sees one System's tables only has no System Achievement", async () => {
    const { fake, lang, getProfileStore, listedTitles } = await startScenario({
        now: new Date(2026, 8, 23, 10, 0, 0),
        tables: TABLES,
        files: { [`${PROFILES_FOLDER}\\Alice\\profile.json`]: { version: 1, isChild: true, plays: {}, notified: [] } },
        folders: [`${PROFILES_FOLDER}\\Bob`],
    });
    const systemTitles = ["Visual Pinball X", "Pinball FX"].map(name => lang.achievements.systemCompletionTitle(name));
    const shownSystemTitles = () => listedTitles().filter(title => systemTitles.includes(title)).sort();

    // Without the Profile Picker, startup is always on Guest.
    getProfileStore().switchTo("Alice");
    await settle();
    assert.deepEqual(shownSystemTitles(), [], "Alice sees the Visual Pinball X tables only");

    getProfileStore().switchTo("Bob");
    await settle();
    assert.deepEqual(shownSystemTitles(), [...systemTitles].sort(), "Bob sees both Systems");
    assertNoErrorLogged(fake);
});
