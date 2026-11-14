// ============================================================
// The Wheel Order on the pack's own filters through main.js: Tables to
// Discover, Hidden Tables and Original Tables list their tables by title,
// then by year once switched (oldest first, ties by title, no year last),
// each staying the Active Filter, the table kept; Most Played Tables keeps its ranking.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "wheelOrder", "tablesToDiscover", "hallOfFame", "hiddenTables", "customFilter"];
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const PROFILES = `${PACK}\\profiles`;
const INFO_LOG = `${PACK}\\logs\\info.log`;
const TABLES_TO_DISCOVER = "User.project.TablesToDiscover";
const MOST_PLAYED = "User.project.HallOfFame";
const HIDDEN_TABLES = "User.project.HiddenTables";
const ORIGINAL_TABLES = "User.project.OriginalTables";

const table = (title, year, extra = {}) => ({ id: title, configId: title, title, year, manufacturer: "Williams", isConfigured: true, ...extra });
// Out of alphabetical order on purpose: the pack's filters sort by title themselves.
const TABLES = [
    table("Medieval Madness", 1997),
    table("Space Trip", undefined),
    table("Black Knight", 1980),
    table("Attack from Mars", 1995),
    table("Homebrew", 0, { manufacturer: "VPX Community" }),
    table("Eight Ball", 1977),
    table("Cirqus Voltaire", 1997),
    table("Old Secret", 1985, { isHidden: true }),
    table("Lost Prototype", undefined, { isHidden: true }),
    table("Dracula", 1993, { isHidden: true }),
];
const play = seconds => ({ count: 1, seconds, lastPlayed: "2026-11-01T20:00:00" });
// Most played first. Neither the year order nor the alphabetical one is a
// turn of this ranking, so a wheel read from its first table tells them apart.
const PLAYS = {
    "Medieval Madness": play(4000), "Black Knight": play(3000), "Space Trip": play(2000), "Eight Ball": play(1000),
};
const MOST_PLAYED_RANKING = ["Medieval Madness", "Black Knight", "Space Trip", "Eight Ball"];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
let lang;

const wheelTitles = () => fake.getWheelTables().map(game => game.title);
const currentTitle = () => fake.getCurrentTable().title;
// The wheel read from a known first table: the order, whatever the selection.
const orderFrom = (first) => {
    const titles = wheelTitles();
    const start = titles.indexOf(first);
    return [...titles.slice(start), ...titles.slice(0, start)];
};
const switchWheelOrder = async (label) => {
    fake.openMainMenu();
    fake.selectMenuItem(fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title);
    fake.selectMenuItem(label);
    await settle();
};
const chooseFilter = async (filterId) => {
    fake.chooseFilter(filterId);
    await settle();
};

test("setup", async () => {
    fake.addFile(`${PROFILES}\\guest\\profile.json`, JSON.stringify({ version: 1, plays: PLAYS }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    ({ default: lang } = await import("../../common/core/i18n.js"));
    await import("../../main.js");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
});

test("alphabetical: the pack's filters list their tables by title", async () => {
    await chooseFilter(TABLES_TO_DISCOVER);
    assert.deepEqual(wheelTitles(), ["Attack from Mars", "Cirqus Voltaire", "Homebrew"]);

    await chooseFilter(MOST_PLAYED);
    assert.deepEqual(orderFrom(MOST_PLAYED_RANKING[0]), MOST_PLAYED_RANKING, "Most Played Tables keeps its ranking");

    await chooseFilter(HIDDEN_TABLES);
    assert.deepEqual(wheelTitles(), ["Dracula", "Lost Prototype", "Old Secret"]);

    await chooseFilter(ORIGINAL_TABLES);
    assert.deepEqual(wheelTitles(), [
        "Attack from Mars", "Black Knight", "Cirqus Voltaire", "Eight Ball", "Medieval Madness", "Space Trip",
    ]);
});

test("the Info Log compares PinballY's All Tables with the pack's alphabetical order, once", () => {
    const lines = fake.readFile(INFO_LOG).split("\n").filter(line => line.includes("alphabetical order check"));

    assert.equal(lines.length, 1);
    // The fake lists All Tables in collection order, read from the pack's first table.
    assert.match(lines[0], /All Tables from the wheel: PinballY: Attack from Mars, Homebrew, Eight Ball, Cirqus Voltaire, Medieval Madness, Space Trip, Black Knight; /);
    assert.match(lines[0], /pack: Attack from Mars, Black Knight, Cirqus Voltaire, Eight Ball, Homebrew, Medieval Madness, Space Trip; /);
    assert.match(lines[0], /6 of 7 places differ\./);
});

test("switching to by year re-sorts Original Tables at once, the table kept", async () => {
    fake.moveWheel(2);
    assert.equal(currentTitle(), "Cirqus Voltaire");

    await switchWheelOrder(lang.customMenuLabels.wheelOrderAlphabetical);

    assert.equal(fake.currentFilterId(), ORIGINAL_TABLES);
    assert.equal(currentTitle(), "Cirqus Voltaire");
    assert.deepEqual(orderFrom("Eight Ball"), [
        "Eight Ball", "Black Knight", "Attack from Mars", "Cirqus Voltaire", "Medieval Madness", "Space Trip",
    ]);
});

test("by year: the wheel selections list their tables oldest first, no year last", async () => {
    await chooseFilter(TABLES_TO_DISCOVER);
    assert.equal(fake.currentFilterId(), TABLES_TO_DISCOVER);
    assert.deepEqual(orderFrom("Attack from Mars"), ["Attack from Mars", "Cirqus Voltaire", "Homebrew"]);

    await chooseFilter(MOST_PLAYED);
    assert.equal(fake.currentFilterId(), MOST_PLAYED);
    assert.deepEqual(orderFrom(MOST_PLAYED_RANKING[0]), MOST_PLAYED_RANKING, "Most Played Tables keeps its ranking");

    await chooseFilter(HIDDEN_TABLES);
    assert.equal(fake.currentFilterId(), HIDDEN_TABLES);
    assert.deepEqual(orderFrom("Old Secret"), ["Old Secret", "Dracula", "Lost Prototype"]);
});

test("switching back re-sorts Hidden Tables by title at once, the table kept", async () => {
    fake.moveWheel(orderFrom(currentTitle()).indexOf("Dracula"));
    assert.equal(currentTitle(), "Dracula");

    await switchWheelOrder(lang.customMenuLabels.wheelOrderByYear);

    assert.equal(fake.currentFilterId(), HIDDEN_TABLES);
    assert.equal(currentTitle(), "Dracula");
    assert.deepEqual(orderFrom("Dracula"), ["Dracula", "Lost Prototype", "Old Secret"]);
    assertNoErrorLogged(fake);
});
