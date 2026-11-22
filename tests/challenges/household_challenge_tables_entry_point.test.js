// ============================================================
// The Household Challenge Add-on started by main.js on the fake PinballY
// globals, with a decade Household Challenge already locked for the week
// and the Challenges off: the Household Challenge Tables filter is in the
// main menu's filters, and choosing it puts the decade's tables on the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const TABLES = [
    { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 },
    { id: 2, configId: "Attack from Mars", title: "Attack from Mars", manufacturer: "Bally", year: 1995 },
    { id: 3, configId: "Elvira", title: "Elvira", manufacturer: "Bally", year: 1989 },
];

test("the Household Challenge Tables filter puts the Household Challenge's tables on the wheel", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables: TABLES });
    fake.addFolder(`${PROFILES_FOLDER}\\Alice`);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({
        version: 1,
        activeProfile: "Alice",
        householdChallenge: {
            current: { week: "2026-09-21", template: "decadeTables", param: 1990, target: 2, games: [] }, previous: null,
        },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    // The Profile picker too: without it, main.js makes Guest active.
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["householdChallenge", "profilePicker"].includes(key);
    config.language = "en";

    await import("../../main.js");
    await settle();

    const [filter] = fake.scriptFilters().filter(({ id }) => id === "project.HouseholdChallengeTables");
    assert.equal(filter.group, "[Top]");
    assert.equal(fake.scriptFilters().filter(({ id }) => id === "project.ChallengeTables").length, 0, "the Challenges are off");
    fake.setCurrentFilter(`User.${filter.id}`);
    await settle();

    assert.deepEqual(fake.getWheelTables().map(game => game.title), ["Medieval Madness", "Attack from Mars"]);
    assertNoErrorLogged(fake);
});
