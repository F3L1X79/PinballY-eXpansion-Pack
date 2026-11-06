// ============================================================
// The Avatar Frame list keeps the hidden layer rule, through main.js on the
// fake PinballY globals: drawn ahead, open at rest, on the Exit Button and
// closed, no hidden layer of its own is more than a point and no visible one
// is a point; the Exit Button's tooltip is a point until it is selected.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, DRAWN_AHEAD_MS } from "../mastery/mastery_bar_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { AVATAR_FRAME_LIST_Z_INDEX } from "../../common/avatar_frames/avatar_frame_list_painter.js";
import { openProfileStats, choose, press, untilFrameListShown } from "../stats/profile_stats_reader.js";
import { highlightedChoice } from "./avatar_frame_list_reader.js";

// The marker is the Selection Marker's own: left to it.
const LIST_Z_INDEXES = Object.entries(AVATAR_FRAME_LIST_Z_INDEX).filter(([name]) => name !== "marker").map(([, zIndex]) => zIndex);
const WINDOW_SPAN = { xSpan: 1, ySpan: 1 };

const listLayers = fake => fake.drawingLayers().filter(layer => LIST_Z_INDEXES.includes(layer.zIndex));
const tooltipLayer = fake => listLayers(fake).find(layer => layer.zIndex === AVATAR_FRAME_LIST_Z_INDEX.tooltip);

function assertRuleHeld(fake, where) {
    assert.ok(listLayers(fake).length > 0, where);
    assert.deepEqual(layersBreakingTheRule(fake, listLayers(fake)), [], where);
}

test("the Avatar Frame list leaves no hidden layer bigger than a point, nor a visible one that is a point", async () => {
    const fake = await startScenario({
        addOns: ["tableMastery", "achievements", "customMenuCommands"], frameImages: true, profiles: { guest: { collectionTier: 3 } },
    });
    fake.advanceTime(DRAWN_AHEAD_MS);
    const { default: lang } = await import("../../common/core/i18n.js");
    assertRuleHeld(fake, "drawn ahead, before the first opening");

    openProfileStats(fake, lang);
    choose(fake, "Avatar Frames");
    untilFrameListShown(fake);
    assert.equal(highlightedChoice(fake), "None", "opens on the worn row");
    assertRuleHeld(fake, "open at rest");
    assert.ok(isPoint(tooltipLayer(fake)), "the Exit Button's tooltip waits as a point");
    const [backdrop] = listLayers(fake).filter(layer => layer.zIndex === AVATAR_FRAME_LIST_Z_INDEX.backdrop);
    assert.deepEqual(backdrop.scale(), WINDOW_SPAN, "the backdrop shows over the whole window");

    press(fake, "Next");
    assert.equal(highlightedChoice(fake), lang.buttonHints.back, "the Exit Button selected, its tooltip shown");
    assertRuleHeld(fake, "on the Exit Button");
    press(fake, "Next");
    assert.ok(isPoint(tooltipLayer(fake)), "a point again once another choice is selected");
    assertRuleHeld(fake, "back on a row");

    press(fake, "Exit");
    assert.deepEqual(listLayers(fake).filter(layer => !isPoint(layer)).map(layer => layer.zIndex), [], "every layer kept is a point once closed");
    assertNoErrorLogged(fake);
});
