// ============================================================
// The High Score Board at rest keeps the hidden layer rule: open on a long
// board, scrolled, redrawn after its fresh read and closed, no hidden layer
// of its own nor crown is more than a point and no visible one is a point.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { startHighScores, board, MEDIEVAL } from "./high_scores_scenario.js";
import { openBoard, press, rows, boardLayerCount } from "./high_score_board_reader.js";
import { HIGH_SCORE_BOARD_Z_INDEX, HIGH_SCORE_BOARD_CROWN_Z_INDEX } from "../../common/high_scores/high_score_board_painter.js";

const TEN_PLACES = board(
    ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"], ["RCF", "10000000"],
    ["DTW", "9000000"], ["CPG", "8000000"], ["JAB", "7000000"], ["MRP", "6000000"], ["KOZ", "5000000"],
);
const Z_INDEXES = [...Object.values(HIGH_SCORE_BOARD_Z_INDEX), HIGH_SCORE_BOARD_CROWN_Z_INDEX];

const boardLayers = fake => fake.drawingLayers().filter(layer => Z_INDEXES.includes(layer.zIndex));

function assertRuleHeld(fake, where) {
    assert.deepEqual(layersBreakingTheRule(fake, boardLayers(fake)), [], where);
}

test("the High Score Board leaves no hidden layer bigger than a point, nor a visible one that is a point", async () => {
    const { fake, setBoard } = await startHighScores({ profiles: { Alice: {} }, active: "Alice" });
    const { default: lang } = await import("../../common/core/i18n.js");
    fake.advanceTime(5000);
    assertRuleHeld(fake, "the crowns drawn ahead");

    setBoard(MEDIEVAL, TEN_PLACES);
    openBoard(fake, lang);
    assertRuleHeld(fake, "open on the last known board");
    await settle();
    fake.advanceTime(1000);
    await settle();
    assertRuleHeld(fake, "redrawn after its fresh read");
    const rowLayers = fake.drawingLayers().filter(layer => layer.zIndex === HIGH_SCORE_BOARD_Z_INDEX.rows);
    assert.ok(rowLayers.some(isPoint) && rows(fake, lang).length > 0, "some rows out of view, some in it");

    press(fake, "Next");
    press(fake, "Next");
    assertRuleHeld(fake, "scrolled");

    press(fake, "Exit");
    assert.equal(boardLayerCount(fake), 0);
    assertRuleHeld(fake, "closed, the crowns kept");
    assertNoErrorLogged(fake);
});
