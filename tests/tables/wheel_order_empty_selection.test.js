// ============================================================
// By year, through main.js: the Challenge Tables, emptied once the Challenge
// is completed, give way to the sorted copy of All Tables, not to PinballY's
// All Tables.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const COPY_FILTER = "User.project.WheelOrder";
const CHALLENGE_TABLES_FILTER = "User.project.ChallengeTables";
const WEEK = "2026-09-21";
const table = (id, manufacturer, year) => ({ id, configId: `Table ${id}`, title: `Table ${id}`, manufacturer, year });
const TABLES = [table(1, "Stern", 2016), table(2, "Stern", 2020), table(3, "Williams", 1992), table(4, "Bally", 1980)];
const BY_YEAR_ALL = ["Table 4", "Table 3", "Table 1", "Table 2"];

test("by year, emptied Challenge Tables give way to the sorted copy of All Tables", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 21, 20, 0, 0), tables: TABLES });
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({
        challenge: { firstWeek: WEEK, week: WEEK, games: [], completed: false, completedCount: 0, judgedWeek: "", history: [] },
    }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({
        version: 1, activeProfile: "Alice", wheelOrder: "byYear",
        challenge: { current: { week: WEEK, template: "manufacturerTables", param: "Stern", target: 2 }, previous: null },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["challenges", "customMenuCommands", "wheelOrder"].includes(key);
    config.language = "en";
    await import("../../main.js");
    await settle();
    const { getWheelOrder } = await import("../../common/tables/wheel_order.js");
    const play = game => {
        fake.gameStarted(game);
        fake.advanceTime(90 * 1000);
        fake.gameOver(game);
    };

    fake.chooseFilter(CHALLENGE_TABLES_FILTER);
    await settle();
    assert.equal(fake.currentFilterId(), CHALLENGE_TABLES_FILTER);
    play(TABLES[0]);
    play(TABLES[1]);
    await settle();

    assert.equal(fake.currentFilterId(), COPY_FILTER, "the sorted copy, not PinballY's All Tables");
    assert.equal(getWheelOrder().getChosenFilterId(), "All");
    const wheel = fake.getWheelTables().map(game => game.title);
    const start = wheel.indexOf(BY_YEAR_ALL[0]);
    assert.deepEqual([...wheel.slice(start), ...wheel.slice(0, start)], BY_YEAR_ALL);
    assertNoErrorLogged(fake);
});
