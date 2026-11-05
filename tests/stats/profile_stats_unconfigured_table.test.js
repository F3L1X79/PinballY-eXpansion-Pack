// ============================================================
// An unconfigured table in the Profile Stats, through main.js on the fake
// PinballY globals: out of the Collection and the Collection Mastery. A table
// played, then no longer configured, shows like a table hidden since: its
// Play stays in the totals and it can still be the last table played.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { openProfileStats, collectionMastery, section, press } from "./profile_stats_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

const table = (id, title, extra = {}) => ({
    id, configId: `${title} (Williams 1990)`, title, manufacturer: "Williams", year: 1990, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: true, ...extra,
});

const PLAYED = table(1, "Played");
const NOT_PLAYED = table(2, "Not Played");
const ANOTHER = table(3, "Another");
const UNCONFIGURED = table(4, "No Longer Configured", { isConfigured: false });
const HIDDEN = table(5, "Hidden Since", { isHidden: true });

const play = lastPlayed => ({ count: 1, seconds: 600, lastPlayed });

// Played PLAYED, then that table last.
function seedProfile(fake, name, lastTable) {
    fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({
        version: 1,
        notified: [],
        plays: {
            [PLAYED.configId]: play("2026-09-20T20:00:00"),
            [lastTable.configId]: play("2026-09-22T20:00:00"),
        },
    }));
}

test("a table no longer configured leaves the Collection and reads like a table hidden since", async () => {
    const fake = createFakePinballYHost({
        now: new Date(2026, 8, 23, 10, 0, 0),
        tables: [PLAYED, NOT_PLAYED, ANOTHER, UNCONFIGURED, HIDDEN],
    });
    seedProfile(fake, "Alice", UNCONFIGURED);
    seedProfile(fake, "Bob", HIDDEN);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "achievements";
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();

    const STATS = lang.profileStats;
    function statsOf(name) {
        getProfileStore().switchTo(name);
        openProfileStats(fake, lang);
        const shown = {
            collection: section(fake, STATS.sections.progression, STATS.stats)[STATS.stats.collection],
            mastery: collectionMastery(fake, STATS),
            games: section(fake, STATS.sections.game, STATS.stats)[STATS.stats.gamesPlayed],
            lastTable: section(fake, STATS.sections.tastes, STATS.stats)[STATS.stats.lastTablePlayed][0],
            favouriteTable: section(fake, STATS.sections.tastes, STATS.stats)[STATS.stats.favouriteTable],
            favouriteManufacturer: section(fake, STATS.sections.tastes, STATS.stats)[STATS.stats.favouriteManufacturer],
        };
        press(fake, "Exit");
        return shown;
    }

    const alice = statsOf("Alice");
    const bob = statsOf("Bob");

    assert.deepEqual(alice.collection, ["1/3", "33%"], "out of the Collection");
    // The goal is capped at the collection's size, here without that table.
    assert.equal(alice.mastery.current, "Current: 1/3", "out of the Collection Mastery");
    assert.deepEqual(alice.games, ["2"], "its Play stays in the totals");
    assert.equal(alice.lastTable, UNCONFIGURED.title, "it can still be the last table played");

    assert.deepEqual({ ...alice, lastTable: null }, { ...bob, lastTable: null }, "the same as a table hidden since");
    assert.equal(bob.lastTable, HIDDEN.title);
    assertNoErrorLogged(fake);
});
