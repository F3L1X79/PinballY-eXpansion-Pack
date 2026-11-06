// ============================================================
// The Profile Stats and the Household Stats at rest keep the hidden layer
// rule: open, set aside under a child, shown again and closed, no hidden
// layer of theirs is more than a point and no visible one is a point; an
// unselected tooltip or a column out of view is a point until shown.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold } from "./household_stats_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { shownLayers } from "../support/shown_layers.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { PROFILE_STATS_Z_INDEX } from "../../common/stats/profile_stats_painter.js";
import { HOUSEHOLD_STATS_Z_INDEX } from "../../common/stats/household_stats_painter.js";
import { openProfileStats, highlighted, choose, press, PROFILE_STATS_OPEN_MS } from "./profile_stats_reader.js";
import { untilHouseholdStatsFadedIn, highlightedColumn, chooseColumn, isMarkerOnExitButton, GLIDE_OVER_MS } from "./household_stats_reader.js";

const NAMES = ["Ann", "Ben", "Cat", "Dan", "Eve", "Fay", "Gus"];
const Z_INDEXES = [...Object.values(PROFILE_STATS_Z_INDEX), ...Object.values(HOUSEHOLD_STATS_Z_INDEX)];

const screenLayers = fake => fake.drawingLayers().filter(layer => Z_INDEXES.includes(layer.zIndex));

function assertRuleHeld(fake, where) {
    assert.deepEqual(layersBreakingTheRule(fake, screenLayers(fake)), [], where);
}

const layersAt = (fake, zIndex) => fake.drawingLayers().filter(layer => layer.zIndex === zIndex);

test("the Profile Stats and the Household Stats leave no hidden layer bigger than a point, nor a visible one that is a point", async () => {
    const { fake, lang } = await startHousehold({ profiles: Object.fromEntries(NAMES.map(name => [name, {}])), active: "Ann" });
    openProfileStats(fake, lang);
    // Opened from the main menu, on the Exit Button.
    assert.equal(highlighted(fake), lang.buttonHints.back);
    assertRuleHeld(fake, "the Profile Stats open");
    const [tooltip] = layersAt(fake, PROFILE_STATS_Z_INDEX.tooltips);
    const shownScale = tooltip.scale();
    press(fake, "Next");
    assert.ok(isPoint(tooltip), "the Exit Button's tooltip, unselected, is a point");
    assertRuleHeld(fake, "the Profile Stats on a button");

    while (highlighted(fake) !== lang.buttonHints.back) press(fake, "Next");
    assert.deepEqual(shownLayers(fake, PROFILE_STATS_Z_INDEX.tooltips), [tooltip], "the tooltip shows once its choice is selected");
    assert.deepEqual(tooltip.scale(), shownScale, "at its size");
    assertRuleHeld(fake, "the Profile Stats on the Exit Button");

    choose(fake, lang.profileStats.buttons.household);
    untilHouseholdStatsFadedIn(fake);
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assertRuleHeld(fake, "the Household Stats open over the Profile Stats set aside");
    const columns = layersAt(fake, HOUSEHOLD_STATS_Z_INDEX.columns);
    assert.ok(columns.some(isPoint) && columns.some(column => !isPoint(column)), "some columns out of view, some in it");

    press(fake, "Prev");
    assert.ok(isMarkerOnExitButton(fake));
    assert.equal(shownLayers(fake, HOUSEHOLD_STATS_Z_INDEX.tooltip).length, 1, "the Household Stats' tooltip shows");
    assertRuleHeld(fake, "the Household Stats on the Exit Button");
    press(fake, "Next");
    assertRuleHeld(fake, "the Household Stats back on a column");
    while (highlightedColumn(fake) !== "Gus") {
        press(fake, "Next");
        fake.advanceTime(GLIDE_OVER_MS);
    }
    assertRuleHeld(fake, "the Household Stats glided to the last column");

    chooseColumn(fake, "Gus");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assertRuleHeld(fake, "Gus's Profile Stats over the Household Stats set aside");

    press(fake, "Exit");
    assertRuleHeld(fake, "the Household Stats shown again");
    press(fake, "Exit");
    assertRuleHeld(fake, "the Profile Stats shown again");
    choose(fake, lang.buttonHints.back);
    assert.deepEqual(screenLayers(fake), [], "nothing kept once closed");
    assertRuleHeld(fake, "closed");
    assertNoErrorLogged(fake);
});
