// ============================================================
// The Collection Mastery on the drawn Profile Stats' card, in French,
// through main.js on the fake PinballY globals: at tier 0 the goal is ten
// tables at the first level; at a middle tier, the next level's goal and
// how many tables reach it; at tier 10, every table reached the last level
// and no count shows.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { tableNumbered } from "../welcome_screen/welcome_screen_collection_scenario.js";
import { openProfileStats, collectionMastery, press } from "./profile_stats_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// The Play seconds that reach each Mastery Level, from level 1.
const SECONDS_AT_LEVEL = [60, 1800, 3600, 6300, 9000, 12600, 18000, 23400, 32400, 43200];
const TABLES = Array.from({ length: 12 }, (_, index) => tableNumbered(index + 1, { isConfigured: true }));

// The Mastery Level of each table, in order, by Profile.
const PROFILE_LEVELS = {
    Alice: [2, 1, 1],
    Bob: [5, 4, 4, 4, 3, 3, 3, 3, 3, 3, 2],
    Carol: TABLES.map(() => 10),
};

function playsAt(levels) {
    const plays = {};
    levels.forEach((level, index) => {
        plays[TABLES[index].configId] = { count: 1, seconds: SECONDS_AT_LEVEL[level - 1], lastPlayed: "2026-09-22T21:00:00" };
    });
    return plays;
}

test("the card shows the Collection Mastery's goal, count and tier", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables: TABLES });
    for (const [name, levels] of Object.entries(PROFILE_LEVELS)) {
        fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, notified: [], plays: playsAt(levels) }));
    }
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "achievements";
    config.language = "fr";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    const collectionOf = name => {
        getProfileStore().switchTo(name);
        openProfileStats(fake, lang);
        const shown = collectionMastery(fake, lang.profileStats);
        press(fake, "Exit");
        return shown;
    };

    assert.deepEqual(collectionOf("Alice"), { goal: "Objectif : 10 tables Novice", current: "3/10 tables", tier: 0 });
    assert.deepEqual(collectionOf("Bob"), { goal: "Objectif : 10 tables Disciple", current: "4/10 tables", tier: 3 });
    assert.deepEqual(collectionOf("Carol"), { goal: "Toutes tes tables : Mage du flipper", current: null, tier: 10 });
    assertNoErrorLogged(fake);
});
