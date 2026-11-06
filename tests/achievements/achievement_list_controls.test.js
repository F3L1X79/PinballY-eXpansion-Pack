// ============================================================
// The Achievement List on the Drawn Screen controls, through main.js on the
// fake PinballY globals with slow draws: while it gets ready only Exit acts,
// going back where it was opened from; attract mode goes back nowhere. Once
// shown, a held Select, Launch or Exit counts once, a held flipper repeats,
// and Select goes back only on the Exit Button, main menu or Profile Stats.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readVeil } from "../support/opening_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { ACHIEVEMENT_LIST_Z_INDEX } from "../../common/achievements/achievement_list.js";
import { startPack, startOpeningFromMainMenu, LIST_VEIL } from "./achievement_list_opening_scenario.js";
import { isListOpen, press, untilListShown, highlightedTexts, isMarkerOnExitButton, GLIDE_OVER_MS } from "./achievement_list_reader.js";
import {
    openProfileStats, choose, hold, isProfileStatsOpen, highlighted, untilProfileStatsFadedIn, PROFILE_STATS_OPEN_MS,
} from "../stats/profile_stats_reader.js";

const LIST_Z_INDEXES = Object.values(ACHIEVEMENT_LIST_Z_INDEX);

function assertNothingLeft(fake) {
    assert.deepEqual(readVeil(fake), { shown: false }, "no veil");
    assert.deepEqual(readLoader(fake), { shown: false }, "no Loader");
    assert.equal(fake.drawingLayers().filter(layer => LIST_Z_INDEXES.includes(layer.zIndex) && layer.alpha > 0).length, 0,
        "nothing of the list shows");
}

// The commands PinballY ran during run().
function commandsDuring(fake, run) {
    const before = fake.executedCommands().length;
    run();
    return fake.executedCommands().slice(before);
}

test("the Achievement List gives up on Exit while getting ready, counts a held button once, and goes with attract mode", async () => {
    const { fake, lang } = await startPack({ drawMs: 60 });
    const SHOW_MAIN_MENU = globalThis.command.ShowMainMenu;

    startOpeningFromMainMenu(fake, lang);
    fake.advanceTime(200);
    assert.equal(readLoader(fake).shown, true, "getting ready");
    for (const button of ["Next", "Prev", "Select"]) {
        assert.ok(press(fake, button).defaultPrevented, `${button} never reaches the wheel`);
    }
    assert.equal(readLoader(fake).shown, true, "still getting ready");
    assert.deepEqual(commandsDuring(fake, () => assert.ok(press(fake, "Exit").defaultPrevented)), [SHOW_MAIN_MENU], "the main menu reopens");
    assertNothingLeft(fake);
    fake.advanceTime(2000);
    assertNothingLeft(fake);

    openProfileStats(fake, lang);
    choose(fake, lang.profileStats.buttons.achievements);
    assert.deepEqual(readVeil(fake), LIST_VEIL, "getting ready over the Profile Stats");
    press(fake, "Exit");
    // The Profile Stats get ready in turn, under their own veil.
    untilProfileStatsFadedIn(fake);
    assertNothingLeft(fake);
    assert.equal(isProfileStatsOpen(fake), true, "back to the Profile Stats");
    press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);

    startOpeningFromMainMenu(fake, lang);
    assert.equal(readVeil(fake).shown, true, "getting ready once more");
    assert.deepEqual(commandsDuring(fake, () => fake.fire("attractmodestart", {})), [], "attract mode goes back nowhere");
    assertNothingLeft(fake);
    fake.advanceTime(2000);
    assertNothingLeft(fake);
    assert.equal(isListOpen(fake), false);

    startOpeningFromMainMenu(fake, lang);
    untilListShown(fake);
    assert.ok(isMarkerOnExitButton(fake), "opened on the Exit Button, the press that opened it not acting on it");
    for (const button of ["Select", "Launch", "Exit"]) {
        assert.ok(hold(fake, button).defaultPrevented, `a held ${button} never reaches the wheel`);
        assert.equal(isListOpen(fake), true, `a held ${button} leaves the list open`);
    }
    hold(fake, "Next");
    fake.advanceTime(GLIDE_OVER_MS);
    const firstRow = highlightedTexts(fake);
    hold(fake, "Next");
    fake.advanceTime(GLIDE_OVER_MS);
    assert.notDeepEqual(highlightedTexts(fake), firstRow, "a held flipper keeps moving");
    assert.deepEqual(commandsDuring(fake, () => press(fake, "Select")), [], "Select on a row does nothing");
    assert.equal(isListOpen(fake), true);
    assert.deepEqual(commandsDuring(fake, () => press(fake, "Exit")), [SHOW_MAIN_MENU], "Exit goes back to the main menu");
    assertNothingLeft(fake);

    openProfileStats(fake, lang);
    choose(fake, lang.profileStats.buttons.achievements);
    untilListShown(fake);
    assert.equal(isProfileStatsOpen(fake), false, "set aside under the list");
    press(fake, "Select");
    untilProfileStatsFadedIn(fake);
    assertNothingLeft(fake);
    assert.equal(isProfileStatsOpen(fake), true, "Select on the Exit Button brings them back");
    assert.equal(highlighted(fake), lang.profileStats.buttons.achievements, "on their button");
    assertNoErrorLogged(fake);
});
