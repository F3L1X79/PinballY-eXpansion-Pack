// ============================================================
// By year, through main.js: the Table of the Day launched from the Welcome
// Screen while the chosen filter (Favorites) leaves it out gives way to the
// sorted copy of All Tables, not to PinballY's All Tables, the table selected.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS, choose } from "../welcome_screen/welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const COPY_FILTER = "User.project.WheelOrder";
const TABLES = [
    { id: 1, configId: "Medieval Madness", title: "Medieval Madness", year: 1997, isFavorite: true, lastPlayed: new Date(2026, 7, 1) },
    { id: 2, configId: "Attack from Mars", title: "Attack from Mars", year: 1995, lastPlayed: new Date(2026, 5, 1) },
    { id: 3, configId: "Theatre of Magic", title: "Theatre of Magic", year: 1995, lastPlayed: null },
    { id: 4, configId: "Godzilla", title: "Godzilla", year: 2021, isFavorite: true, lastPlayed: new Date(2026, 6, 1) },
];
const BY_YEAR_ALL = ["Attack from Mars", "Theatre of Magic", "Medieval Madness", "Godzilla"];

test("by year, launching the Table of the Day off the chosen filter shows the sorted copy of All Tables", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables: TABLES });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", wheelOrder: "byYear" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ["customMenuCommands", "startupChoicePrompt", "wheelOrder"].includes(key);
    }
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    const { getWheelOrder } = await import("../../common/tables/wheel_order.js");

    fake.chooseFilter("Favorites");
    await settle();
    assert.deepEqual(fake.getWheelTables().map(game => game.title).sort(), ["Godzilla", "Medieval Madness"]);
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    choose(fake, lang.welcomeScreen.periodCards.day.period);

    assert.equal(fake.launches()[0].title, "Theatre of Magic");
    assert.equal(fake.currentFilterId(), COPY_FILTER, "the sorted copy, not PinballY's All Tables");
    assert.equal(getWheelOrder().getChosenFilterId(), "All");
    assert.equal(fake.getCurrentTable().title, "Theatre of Magic");
    const wheel = fake.getWheelTables().map(game => game.title);
    const start = wheel.indexOf(BY_YEAR_ALL[0]);
    assert.deepEqual([...wheel.slice(start), ...wheel.slice(0, start)], BY_YEAR_ALL);
    assertNoErrorLogged(fake);
});
