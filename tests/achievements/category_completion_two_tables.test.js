// ============================================================
// Category Achievements need two tables, through main.js on the fake
// PinballY globals and read in the Achievement List: a category of one
// table the Profile can see (hidden and unconfigured tables left out) gives
// none, one of two does; a decade or a manufacturer of one table still does.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, table } from "./achievement_progress_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const MEDIEVAL = table(1, "Medieval Madness", "Williams", 1997, ["Fantasy", "Castles"]);
const TWILIGHT = table(2, "Twilight Zone", "Williams", 1993, ["Fantasy"]);
const ADDAMS = table(3, "Addams Family", "Williams", 1992, ["Horror"]);
const HIDDEN_HORROR = { ...table(4, "Haunted House", "Gottlieb", 1982, ["Horror"]), isHidden: true };
const UNCONFIGURED_HORROR = { ...table(5, "Elvira", "Bally", 1989, ["Horror"]), isConfigured: false };
// The only table of its decade and of its manufacturer.
const SPACE = table(6, "Space Shuttle", "Zaccaria", 1975, []);

test("a category of one table the Profile can see gives no Achievement, a decade or a manufacturer of one table does", async () => {
    const { fake, lang, listedTitles } = await startScenario({
        now: new Date(2026, 8, 23, 10, 0, 0),
        tables: [MEDIEVAL, TWILIGHT, ADDAMS, HIDDEN_HORROR, UNCONFIGURED_HORROR, SPACE],
    });
    const ACHIEVEMENT = lang.achievements;

    const titles = listedTitles();
    assert.ok(titles.includes(ACHIEVEMENT.categoryCompletionTitle("Fantasy")), "two tables");
    assert.ok(!titles.includes(ACHIEVEMENT.categoryCompletionTitle("Castles")), "one table");
    assert.ok(!titles.includes(ACHIEVEMENT.categoryCompletionTitle("Horror")), "one table the Profile can see");
    assert.ok(titles.includes(ACHIEVEMENT.decadeCompletionTitle(1970)), "a decade of one table");
    assert.ok(titles.includes(ACHIEVEMENT.manufacturerCompletionTitle("Zaccaria")), "a manufacturer of one table");

    assertNoErrorLogged(fake);
});
