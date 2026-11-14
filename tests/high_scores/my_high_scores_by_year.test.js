// ============================================================
// My High Scores through main.js with the Wheel Order by year: the ranked
// selection keeps its best-place-first order, and keeps it when the order
// switches back to alphabetical while it is on the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHighScores, HIGH_SCORES_FILE } from "./high_scores_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { settle } from "../support/fake_pinbally_host.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const table = (id, title, year) => ({ id, configId: title, title, manufacturer: "Williams", year, rom: `rom_${id}` });
// By year Medieval Madness, Attack from Mars, Black Knight: neither that
// order nor the alphabetical one is a turn of the ranked wheel.
const MEDIEVAL = table(1, "Medieval Madness", 1980);
const MARS = table(2, "Attack from Mars", 1995);
const BLACK_KNIGHT = table(3, "Black Knight", 1997);

const place = (rank, owner) => ({ rank, initials: "AAA", score: 1000 - rank, owner });
// Alice's places: 1st on Medieval Madness, 2nd on Black Knight, 3rd on Attack from Mars.
const BOARDS = {
    [MEDIEVAL.configId]: [place(1, "Alice")],
    [BLACK_KNIGHT.configId]: [place(1, null), place(2, "Alice")],
    [MARS.configId]: [place(1, null), place(2, null), place(3, "Alice")],
};
const HIGH_SCORES = {
    version: 1,
    tables: Object.fromEntries(Object.entries(BOARDS).map(([configId, board]) => [configId, { board }])),
    highScores: [],
};
const RANKED = ["Medieval Madness", "Black Knight", "Attack from Mars"];
const FILTER_ID = "User.project.MyHighScores";

test("My High Scores keeps its ranking whatever the Wheel Order", async () => {
    const { fake } = await startHighScores({
        addOns: ["highScores", "customMenuCommands", "wheelOrder"],
        profiles: { Alice: {} },
        active: "Alice",
        tables: [MEDIEVAL, MARS, BLACK_KNIGHT],
        files: {
            [HIGH_SCORES_FILE]: JSON.stringify(HIGH_SCORES),
            [CABINET_FILE]: JSON.stringify({ version: 1, activeProfile: "Alice", wheelOrder: "byYear" }),
        },
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    // The wheel read from the best place: the order, whatever the selection.
    const wheelTitles = () => {
        const titles = fake.getWheelTables().map(game => game.title);
        const start = titles.indexOf(RANKED[0]);
        return [...titles.slice(start), ...titles.slice(0, start)];
    };

    fake.chooseFilter(FILTER_ID);
    await settle();
    assert.equal(fake.currentFilterId(), FILTER_ID);
    assert.deepEqual(wheelTitles(), RANKED, "by year");

    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    fake.openMainMenu();
    fake.selectMenuItem(fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderByYear);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderPageAlphabetical);
    await settle();

    assert.equal(fake.currentFilterId(), FILTER_ID);
    assert.deepEqual(wheelTitles(), RANKED, "alphabetical");
    assertNoErrorLogged(fake);
});
