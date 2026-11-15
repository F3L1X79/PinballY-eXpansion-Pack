// ============================================================
// The wheel's places through main.js: the shared module gives the wheel's
// tables in its order, the selected table's place and each table's page, by
// letter (# first, accents stripped), by decade (no year as "?") or none on
// a ranked selection, and reads the wheel again only when told or out of step.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHighScores, HIGH_SCORES_FILE } from "../high_scores/high_scores_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const table = (title, year, extra = {}) => ({
    id: title, configId: title, title, manufacturer: "Williams", year, isHidden: false, isConfigured: true, rom: `rom_${title}`, ...extra,
});
// In PinballY's alphabetical order, as the fake's All Tables lists them.
const TABLES = [
    table("24", 1975),
    table("Addams Family", 1992),
    table("Black Knight", 1980),
    table("Cyclone", 1988),
    table("Élan Vital", 1984),
    table("Homebrew", 0),
    table("Old Secret", 1985, { isHidden: true }),
];
const play = seconds => ({ count: 1, seconds, lastPlayed: "2026-10-01T20:00:00" });
const HIGH_SCORES = {
    version: 1,
    tables: { Cyclone: { board: [{ rank: 1, initials: "ALI", score: 1000, owner: "Alice" }] } },
    highScores: [],
};

const titles = games => games.map(game => game.title);

test("the wheel's places, pages and reads", async (t) => {
    const { fake } = await startHighScores({
        addOns: ["highScores", "customMenuCommands", "wheelOrder", "hallOfFame", "tablesToDiscover"],
        profiles: { Alice: { plays: { Cyclone: play(3000), 24: play(1000) } } },
        active: "Alice",
        tables: TABLES,
        files: { [HIGH_SCORES_FILE]: JSON.stringify(HIGH_SCORES) },
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getWheelPlaces, WHEEL_PAGINGS } = await import("../../common/tables/wheel_places.js");
    const places = getWheelPlaces();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    const pages = () => places.getTables().map(game => places.pageOf(game));
    const switchWheelOrder = async (entryLabel, orderLabel) => {
        fake.openMainMenu();
        fake.selectMenuItem(fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title);
        fake.selectMenuItem(entryLabel);
        fake.selectMenuItem(orderLabel);
        // No markChanged: the module follows the Wheel Order's toggles itself.
        await settle();
    };
    const chooseFilter = async (filterId) => {
        fake.chooseFilter(filterId);
        await settle();
        places.markChanged();
    };
    // Each time the wheel is read whole.
    let reads = 0;
    const readWheel = globalThis.gameList.getAllWheelGames;
    globalThis.gameList.getAllWheelGames = () => {
        reads++;
        return readWheel();
    };

    await t.test("alphabetical: from the wheel's first table, by letter, # first and accents stripped", () => {
        fake.moveWheel(2);
        assert.equal(fake.getCurrentTable().title, "Black Knight");

        assert.deepEqual(titles(places.getTables()), ["24", "Addams Family", "Black Knight", "Cyclone", "Élan Vital", "Homebrew"]);
        assert.equal(places.placeOf(fake.getCurrentTable()), 3);
        assert.equal(places.getPaging(), WHEEL_PAGINGS.BY_LETTER);
        assert.deepEqual(pages(), ["#", "A", "B", "C", "E", "H"]);
    });

    await t.test("moves never read the wheel again; being told, or out of step, does", () => {
        reads = 0;
        for (const expected of [4, 5, 6]) {
            fake.moveWheel(1);
            assert.equal(places.placeOf(fake.getCurrentTable()), expected);
        }
        assert.equal(reads, 0, "no read per move");

        places.markChanged();
        assert.equal(places.placeOf(fake.getCurrentTable()), 6);
        assert.equal(reads, 1, "read again once told");

        fake.setWheelTables(["Homebrew", "24", "Black Knight"], { filterId: "All" });
        assert.equal(places.placeOf(fake.getCurrentTable()), 3, "out of step: read again");
        assert.equal(reads, 2);
        fake.chooseFilter("All");
    });

    await t.test("by year, the sorted copy pages by decade, the tables without a year last", async () => {
        await switchWheelOrder(lang.customMenuLabels.wheelOrderAlphabetical, lang.customMenuLabels.wheelOrderPageByYear);

        assert.deepEqual(titles(places.getTables()), ["24", "Black Knight", "Élan Vital", "Cyclone", "Addams Family", "Homebrew"]);
        assert.equal(places.placeOf(fake.getCurrentTable()), 6);
        assert.equal(places.getPaging(), WHEEL_PAGINGS.BY_DECADE);
        assert.deepEqual(pages(), [1970, 1980, 1980, 1980, 1990, "?"]);
    });

    await t.test("by year, a pack filter pages by decade", async () => {
        await chooseFilter("User.project.TablesToDiscover");

        assert.deepEqual(titles(places.getTables()), ["Black Knight", "Élan Vital", "Addams Family", "Homebrew"]);
        assert.deepEqual(pages(), [1980, 1980, 1990, "?"]);
    });

    await t.test("by year, PinballY's Hidden filter, never copied, pages by letter", () => {
        fake.setWheelTables(["Old Secret"], { filterId: "Hidden" });
        places.markChanged();

        assert.equal(places.getPaging(), WHEEL_PAGINGS.BY_LETTER);
        assert.deepEqual(pages(), ["O"]);
    });

    await t.test("a ranked selection has no pages, its places in its ranking", async () => {
        await chooseFilter("User.project.HallOfFame");
        assert.deepEqual(titles(places.getTables()), ["Cyclone", "24"]);
        assert.equal(places.getPaging(), null);
        assert.deepEqual(pages(), [null, null]);

        await chooseFilter("User.project.MyHighScores");
        assert.deepEqual(titles(places.getTables()), ["Cyclone"]);
        assert.equal(places.placeOf(fake.getCurrentTable()), 1);
        assert.equal(places.getPaging(), null);
    });

    await t.test("alphabetical again, a pack filter pages by letter", async () => {
        await chooseFilter("User.project.TablesToDiscover");
        await switchWheelOrder(lang.customMenuLabels.wheelOrderByYear, lang.customMenuLabels.wheelOrderPageAlphabetical);

        assert.deepEqual(titles(places.getTables()), ["Addams Family", "Black Knight", "Élan Vital", "Homebrew"]);
        assert.equal(places.getPaging(), WHEEL_PAGINGS.BY_LETTER);
        assert.deepEqual(pages(), ["A", "B", "E", "H"]);
        assertNoErrorLogged(fake);
    });
});
