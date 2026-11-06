// ============================================================
// The Profile Stats on the Drawn Screen controls, through main.js on the
// fake globals: a held Select or Exit counts once; the Achievement List
// (outside the controls) and the chain Household Stats, another Profile's
// Profile Stats come back one Exit per level, each as it was left; attract
// mode leaves no layer of the chain; Exit while getting ready gives up.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold } from "./household_stats_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readVeil } from "../support/opening_reader.js";
import { readLoader, loaderLayerCount } from "../support/loader_reader.js";
import { isListOpen } from "../achievements/achievement_list_reader.js";
import {
    openProfileStats, startOpeningProfileStats, isProfileStatsOpen, profileStatsLayerCount, cardTexts, highlighted, choose, press, hold,
    PROFILE_STATS_OPEN_MS,
} from "./profile_stats_reader.js";
import { untilHouseholdStatsFadedIn, isHouseholdStatsOpen, householdStatsLayerCount, highlightedColumn } from "./household_stats_reader.js";

const DRAW_MS = 60;

function assertMainMenuOnYourStats(fake, lang) {
    assert.equal(fake.executedCommands().at(-1), globalThis.command.ShowMainMenu, "the main menu reopens");
    fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
    assert.deepEqual(fake.currentMenu().items.filter(item => item.selected).map(item => item.title), [lang.profileStats.menuEntry], "on Your Stats");
    fake.closeMenu();
}

// Bob's read-only Profile Stats, over the Household Stats, over Alice's.
function openBobsOverTheHousehold(fake, lang) {
    choose(fake, lang.profileStats.buttons.household);
    untilHouseholdStatsFadedIn(fake);
    press(fake, "Next");
    press(fake, "Select");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(cardTexts(fake)[0], "Bob");
}

test("the Profile Stats count a held button once and come back level by level", async () => {
    const { fake, lang } = await startHousehold({ profiles: { Alice: {}, Bob: {}, Carol: {} }, active: "Alice" });
    openProfileStats(fake, lang);
    assert.equal(highlighted(fake), lang.buttonHints.back);
    assert.ok(hold(fake, "Select").defaultPrevented, "a held Select never reaches the wheel");
    assert.ok(hold(fake, "Exit").defaultPrevented);
    assert.equal(isProfileStatsOpen(fake), true, "neither held button left the screen");

    // The Achievement List keeps its own listener: set aside, the Profile
    // Stats leave it every press.
    choose(fake, lang.profileStats.buttons.achievements);
    assert.ok(isListOpen(fake));
    for (const button of ["Next", "Next", "Prev", "Select"]) press(fake, button);
    assert.ok(isListOpen(fake), "the list alone took the buttons");
    press(fake, "Exit");
    assert.equal(isListOpen(fake), false);
    assert.equal(highlighted(fake), lang.profileStats.buttons.achievements, "as it was left");

    // Attract mode with the list open over them: nothing of them is kept.
    press(fake, "Select");
    assert.ok(isListOpen(fake));
    fake.enterAttractMode();
    assert.equal(isListOpen(fake), false);
    assert.equal(profileStatsLayerCount(fake), 0, "no layer of the Profile Stats, hidden or not");
    fake.exitAttractMode();
    openProfileStats(fake, lang);

    openBobsOverTheHousehold(fake, lang);
    press(fake, "Exit");
    hold(fake, "Exit");
    assert.equal(isHouseholdStatsOpen(fake), true, "a held Exit climbs one level only");
    assert.equal(highlightedColumn(fake), "Bob", "as it was left");
    press(fake, "Exit");
    assert.equal(isProfileStatsOpen(fake), true);
    assert.equal(highlighted(fake), lang.profileStats.buttons.household, "as it was left");

    openBobsOverTheHousehold(fake, lang);
    fake.enterAttractMode();
    assert.equal(profileStatsLayerCount(fake), 0, "no layer of either Profile Stats, hidden or not");
    assert.equal(householdStatsLayerCount(fake), 0);
    fake.exitAttractMode();

    fake.setDrawMs(DRAW_MS);
    startOpeningProfileStats(fake, lang);
    fake.advanceTime(200);
    assert.equal(readLoader(fake).shown, true, "getting ready");
    for (const button of ["Next", "Select"]) assert.ok(press(fake, button).defaultPrevented, `${button} never reaches the wheel`);
    assert.equal(readLoader(fake).shown, true, "still getting ready");
    press(fake, "Exit");
    fake.advanceTime(2000);
    assert.deepEqual(readVeil(fake), { shown: false });
    assert.deepEqual(readLoader(fake), { shown: false });
    assert.equal(loaderLayerCount(fake), 0);
    assert.equal(profileStatsLayerCount(fake), 0, "given up");
    assertMainMenuOnYourStats(fake, lang);
    assertNoErrorLogged(fake);
});
