// ============================================================
// The Wheel Order's page jumps through main.js on All Tables with the Wheel
// Rail's Decades and years (WHEEL_RAIL_YEARS): by year, Next Page goes from
// one year to the next present, the same year's tables together, the tables
// without a year last; Previous Page goes back; the Info Log names the year.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "wheelOrder", "wheelGuides"];
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const INFO_LOG = `${PACK}\\logs\\info.log`;

const table = (title, year) => ({ id: title, configId: title, title, year });
const TABLES = [
    table("Attack from Mars", 1995),
    table("Avatar", 2010),
    table("Black Knight", 1980),
    table("Eight Ball", 1977),
    table("Funhouse", 1990),
    table("Godzilla", 2021),
    table("Homebrew", 0),
    table("Lord of the Rings", 2003),
    table("Medieval Madness", 1997),
    table("Space Trip", undefined),
    table("Theatre of Magic", 1995),
    table("Tron Legacy", 2011),
];
// The first table of each page stop, by year.
const YEAR_STARTS = ["Eight Ball", "Black Knight", "Funhouse", "Attack from Mars", "Medieval Madness",
    "Lord of the Rings", "Avatar", "Tron Legacy", "Godzilla", "Homebrew"];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
let lang;

const currentTitle = () => fake.getCurrentTable().title;
const pageLines = () => fake.readFile(INFO_LOG).split("\n").filter(line => line.includes(" Page on "));

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    config.wheelRailYears = true;
    ({ default: lang } = await import("../../common/core/i18n.js"));
    await import("../../main.js");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    fake.openMainMenu();
    fake.selectMenuItem(fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderAlphabetical);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderPageByYear);
    await settle();
    const titles = fake.getWheelTables().map(game => game.title);
    fake.moveWheel(titles.indexOf("Eight Ball"));
});

test("by year with Decades and years, Next Page jumps from year to year, then to the tables without a year, then around", async () => {
    const reached = [];
    for (let press = 0; press < YEAR_STARTS.length; press += 1) {
        fake.pressPageButton("NextPage");
        reached.push(currentTitle());
    }
    await settle();

    assert.deepEqual(reached, [...YEAR_STARTS.slice(1), YEAR_STARTS[0]]);
});

test("Previous Page goes back the same way", () => {
    const reached = [];
    for (let press = 0; press < YEAR_STARTS.length; press += 1) {
        fake.pressPageButton("PrevPage");
        reached.push(currentTitle());
    }

    assert.deepEqual(reached, [...YEAR_STARTS].reverse());
});

test("the Info Log names the year reached", async () => {
    await settle();
    const lines = pageLines();

    assert.equal(lines.length, 2 * YEAR_STARTS.length);
    assert.match(lines[0], /\[WheelOrder\] Next Page on All, by year: 1980, "Black Knight"\./);
    assert.match(lines[2], /Next Page on All, by year: 1995, "Attack from Mars"\./);
    assert.match(lines[8], /Next Page on All, by year: no year, "Homebrew"\./);
    assertNoErrorLogged(fake);
});
