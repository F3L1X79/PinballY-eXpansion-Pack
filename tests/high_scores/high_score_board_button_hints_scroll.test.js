// ============================================================
// The High Score Board's Button Hints on a long board, through main.js on
// the fake PinballY globals: in a landscape window too short for a
// 10-place board, the footer names the flippers (Scroll) before Exit
// (Back), and they still scroll the rows; in a portrait window where all
// ten places show, the flippers are left out.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startHighScores, board, MEDIEVAL } from "./high_scores_scenario.js";
import { openBoard, press, rows, buttonHints, exitButtonTooltip } from "./high_score_board_reader.js";
import { expectedButtonHints } from "../support/button_hints_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TEN_PLACES = board(
    ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"], ["RCF", "10000000"],
    ["DTW", "9000000"], ["CPG", "8000000"], ["JAB", "7000000"], ["MRP", "6000000"], ["KOZ", "5000000"],
);

test("Scroll shows only for a board longer than the window, and the flippers still scroll it", async () => {
    const { fake, setBoard } = await startHighScores({ profiles: { Alice: {} }, active: "Alice" });
    const { default: lang } = await import("../../common/core/i18n.js");
    const openRead = async () => {
        openBoard(fake, lang);
        await settle();
        fake.advanceTime(1000);
        await settle();
    };
    setBoard(MEDIEVAL, TEN_PLACES);

    await openRead();
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { flippers: "scroll", select: lang.highScores.board.views.household, exit: "back" }));
    const firstInView = rows(fake, lang)[0].initials;
    press(fake, "Next");
    assert.notEqual(rows(fake, lang)[0].initials, firstInView, "Next scrolls the rows");
    assert.equal(exitButtonTooltip(fake), lang.buttonHints.back);
    press(fake, "Exit");

    fake.setLayoutSize({ width: 1080, height: 1920 });
    await openRead();
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { flippers: null, select: lang.highScores.board.views.household, exit: "back" }));
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
