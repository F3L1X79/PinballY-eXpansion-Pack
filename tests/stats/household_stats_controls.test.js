// ============================================================
// The Household Stats on the Drawn Screen controls, through main.js on the
// fake PinballY globals: a held Select counts once; set aside under another
// Profile's Stats mid-glide, they come back at once as they were left;
// Exit while getting ready goes back to the Profile Stats; those Profile
// Stats failing to open take the whole chain away.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold } from "./household_stats_scenario.js";
import { errorLines } from "../support/error_log.js";
import { whileDrawsFail, FAILING_DRAW_MESSAGE } from "../support/failing_draws.js";
import { readVeil } from "../support/opening_reader.js";
import { readLoader, loaderLayerCount } from "../support/loader_reader.js";
import { cardTexts, isProfileStatsOpen, profileStatsLayerCount, highlighted, hold, choose, PROFILE_STATS_OPEN_MS } from "./profile_stats_reader.js";
import {
    openHouseholdStats, isHouseholdStatsOpen, householdStatsLayerCount, highlightedColumn, chooseColumn, columnsInView, fadedColumns, press,
    GLIDE_OVER_MS,
} from "./household_stats_reader.js";

const NAMES = ["Ann", "Ben", "Cat", "Dan", "Eve", "Fay", "Gus"];
const DRAW_MS = 60;

test("the Household Stats count a held Select once, come back as left, and give up while getting ready", async () => {
    const { fake, lang } = await startHousehold({ profiles: Object.fromEntries(NAMES.map(name => [name, {}])), active: "Ann" });
    openHouseholdStats(fake, lang);
    while (highlightedColumn(fake) !== "Fay") {
        press(fake, "Next");
        fake.advanceTime(GLIDE_OVER_MS);
    }
    // Gus glides into view: a held Select, then a Select while the glide still runs.
    press(fake, "Next");
    assert.ok(hold(fake, "Select").defaultPrevented);
    assert.equal(isHouseholdStatsOpen(fake), true, "a held Select opens nothing");
    press(fake, "Select");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(cardTexts(fake)[0], "Gus");
    assert.equal(isHouseholdStatsOpen(fake), false, "set aside");

    const mark = fake.logLines().length;
    press(fake, "Exit");
    assert.equal(isHouseholdStatsOpen(fake), true, "shown in the same step");
    assert.equal(highlightedColumn(fake), "Gus", "on that Profile's column");
    assert.deepEqual(columnsInView(fake), NAMES.slice(2), "the glide's target");
    assert.deepEqual(fadedColumns(fake), [], "the columns still");
    fake.advanceTime(1000);
    assert.deepEqual(fake.logLines().slice(mark).filter(line => line.includes("] Opened")), [], "no opening time line");

    press(fake, "Exit");
    assert.equal(householdStatsLayerCount(fake), 0, "nothing kept once left");
    assert.equal(highlighted(fake), lang.profileStats.buttons.household);

    fake.setDrawMs(DRAW_MS);
    choose(fake, lang.profileStats.buttons.household);
    fake.advanceTime(200);
    assert.equal(readLoader(fake).shown, true, "getting ready");
    for (const button of ["Next", "Prev", "Select"]) assert.ok(press(fake, button).defaultPrevented, `${button} never reaches the wheel`);
    assert.equal(isProfileStatsOpen(fake), false);
    press(fake, "Exit");
    assert.deepEqual(readVeil(fake), { shown: false });
    assert.deepEqual(readLoader(fake), { shown: false });
    assert.equal(loaderLayerCount(fake), 0);
    assert.equal(householdStatsLayerCount(fake), 0, "given up");
    assert.equal(isProfileStatsOpen(fake), true, "back to the Profile Stats at once");
    assert.equal(highlighted(fake), lang.profileStats.buttons.household, "on their button");

    fake.setDrawMs(0);
    press(fake, "Exit");
    openHouseholdStats(fake, lang);
    whileDrawsFail(() => {
        chooseColumn(fake, "Ben");
        fake.advanceTime(1000);
    });
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].startsWith("[DrawingAhead] ERROR") && errors[0].includes(FAILING_DRAW_MESSAGE), "the failure is logged");
    assert.equal(profileStatsLayerCount(fake), 0, "no layer of either Profile Stats, hidden or not");
    assert.equal(householdStatsLayerCount(fake), 0);
    assert.ok(!press(fake, "Exit").defaultPrevented, "no screen left to take the buttons");
});
