// ============================================================
// The lower status line's "Table n/total" through main.js: the selected
// table's place in the wheel's order, alphabetical, by year (the Wheel
// Order's sorted copy), and in My High Scores' ranking.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHighScores, HIGH_SCORES_FILE } from "../high_scores/high_scores_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const table = (id, title, year) => ({ id, configId: title, title, manufacturer: "Williams", year, isHidden: false, rom: `rom_${id}` });
// In PinballY's alphabetical order, as the fake's All Tables lists them.
const TABLES = [
    table(1, "Addams Family", 1992),
    table(2, "Black Knight", 1980),
    table(3, "Cyclone", 1988),
    table(4, "Dracula", 1993),
    table(5, "Eight Ball", 1977),
];
const place = rank => ({ rank, initials: "ALI", score: 1000 - rank, owner: "Alice" });
// Alice's best place on Cyclone, then on Addams Family.
const HIGH_SCORES = {
    version: 1,
    tables: { Cyclone: { board: [place(1)] }, "Addams Family": { board: [place(9), place(2)] } },
    highScores: [],
};

test("the status line counts the selected table in the wheel's order", async () => {
    const { fake } = await startHighScores({
        addOns: ["statusLineInfo", "highScores", "customMenuCommands", "wheelOrder"],
        profiles: { Alice: {} },
        active: "Alice",
        tables: TABLES,
        files: { [HIGH_SCORES_FILE]: JSON.stringify(HIGH_SCORES) },
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    const position = () => {
        const line = fake.lowerStatusLine().find(text => /^Table \d+\//.test(text));
        return Number(line.match(/^Table (\d+)\//)[1]);
    };

    fake.moveWheel(3);
    assert.equal(fake.getCurrentTable().title, "Dracula");
    assert.equal(position(), 4, "alphabetical");

    fake.openMainMenu();
    fake.selectMenuItem(lang.customMenuLabels.activeFilter("All Tables"));
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderAlphabetical);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderPageByYear);
    await settle();
    fake.moveWheel(-1);
    assert.equal(fake.getCurrentTable().title, "Addams Family");
    assert.equal(position(), 4, "by year: Eight Ball, Black Knight, Cyclone, Addams Family, Dracula");

    fake.selectFilter("User.project.MyHighScores");
    fake.fire("wheelmode");
    await settle();
    assert.deepEqual(fake.getWheelTables().map(game => game.title), ["Cyclone", "Addams Family"]);
    fake.moveWheel(1);
    assert.equal(position(), 2, "My High Scores: Cyclone, then Addams Family");
    assertNoErrorLogged(fake);
});
