// ============================================================
// By year, through main.js: Profile Stats' Tables to Discover button, chosen
// while the sorted copy of All Tables is shown, puts that pack filter on the
// wheel by year, and it is the filter the player chose.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { openProfileStats, choose } from "../stats/profile_stats_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const GUEST_PROFILE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\guest\\profile.json";
const TABLES_TO_DISCOVER_FILTER = "User.project.TablesToDiscover";
const table = (id, title, year) => ({ id, configId: title, title, year, lastPlayed: null });
const TABLES = [table(1, "Attack from Mars", 1995), table(2, "Black Knight", 1980), table(3, "Godzilla", 2021), table(4, "Medieval Madness", 1997)];

test("by year, Profile Stats' jump to Tables to Discover lists them by year", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables: TABLES });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", wheelOrder: "byYear" }));
    fake.addFile(GUEST_PROFILE_FILE, JSON.stringify({
        version: 1, plays: { "Medieval Madness": { count: 3, seconds: 5400, lastPlayed: "2026-09-20T20:00:00" } }, notified: [],
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ["customMenuCommands", "achievements", "tablesToDiscover", "wheelOrder"].includes(key);
    }
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    const { getWheelOrder } = await import("../../common/tables/wheel_order.js");
    assert.equal(fake.currentFilterId(), "User.project.WheelOrder");

    openProfileStats(fake, lang);
    choose(fake, lang.profileStats.buttons.tablesToDiscover);
    await settle();

    assert.equal(fake.currentFilterId(), TABLES_TO_DISCOVER_FILTER);
    assert.equal(getWheelOrder().getChosenFilterId(), TABLES_TO_DISCOVER_FILTER);
    // Read from the oldest: the selected table stays selected.
    const wheel = fake.getWheelTables().map(game => game.title);
    const start = wheel.indexOf("Black Knight");
    assert.deepEqual([...wheel.slice(start), ...wheel.slice(0, start)], ["Black Knight", "Attack from Mars", "Godzilla"]);
    assertNoErrorLogged(fake);
});
