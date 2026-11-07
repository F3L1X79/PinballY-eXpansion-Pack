// ============================================================
// A long High Score Board: in a short landscape window the flippers walk
// the Exit Button, each row, then the view buttons, scrolling the rows the
// least it takes to keep the marked one in view, the podium staying; Select
// on a row does nothing; a board that fits leaves its rows out of the walk.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL } from "./high_scores_scenario.js";
import { openBoard, press, podium, rows, marked, viewName, isBoardOpen } from "./high_score_board_reader.js";

const TEN_PLACES = board(
    ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"], ["RCF", "10000000"],
    ["DTW", "9000000"], ["CPG", "8000000"], ["JAB", "7000000"], ["MRP", "6000000"], ["KOZ", "5000000"],
);
const ROW_INITIALS = ["ZAP", "RCF", "DTW", "CPG", "JAB", "MRP", "KOZ"];

test("the flippers walk a long board's rows, scrolling them under the fixed podium; a board that fits leaves them out", async () => {
    const { fake, setBoard } = await startHighScores({ profiles: { Alice: {} }, active: "Alice" });
    const { default: lang } = await import("../../common/core/i18n.js");
    const VIEWS = lang.highScores.board.views;
    const rowsInView = () => rows(fake, lang).map(row => row.initials);
    const podiumInitials = () => Object.values(podium(fake, lang)).map(step => step.initials);
    const rankOf = initials => String(ROW_INITIALS.indexOf(initials) + 4);
    // Opens the board and lets its fresh read end.
    const openRead = async () => {
        openBoard(fake, lang);
        await settle();
        fake.advanceTime(1000);
        await settle();
    };

    setBoard(MEDIEVAL, TEN_PLACES);
    await openRead();
    const shownAtOnce = rowsInView().length;
    assert.ok(shownAtOnce >= 1 && shownAtOnce < ROW_INITIALS.length, `${shownAtOnce} rows in view in a landscape window`);
    assert.deepEqual(rowsInView(), ROW_INITIALS.slice(0, shownAtOnce));
    assert.deepEqual(podiumInitials(), ["BRE", "SLL", "LFS"]);
    const nextTimes = (count) => {
        for (let step = 0; step < count; step++) press(fake, "Next");
    };
    // From the Table Board's button, past the two others to the Exit Button.
    nextTimes(3);
    assert.equal(marked(fake, lang), "exitButton");

    ROW_INITIALS.forEach((initials, index) => {
        assert.ok(press(fake, "Next").defaultPrevented);
        assert.deepEqual(marked(fake, lang), { row: rankOf(initials) });
        const first = Math.max(0, index - shownAtOnce + 1);
        assert.deepEqual(rowsInView(), ROW_INITIALS.slice(first, first + shownAtOnce), `row ${initials} in view, the least scrolled`);
        assert.deepEqual(podiumInitials(), ["BRE", "SLL", "LFS"], "the podium stays in place");
    });
    assert.ok(press(fake, "Select").defaultPrevented);
    assert.ok(isBoardOpen(fake), "Select on a row does nothing");
    assert.equal(viewName(fake), lang.highScores.board.viewTitles.table);

    press(fake, "Next");
    assert.deepEqual(marked(fake, lang), { view: VIEWS.table }, "the view buttons come after the last row");
    assert.deepEqual(rowsInView(), ROW_INITIALS.slice(-shownAtOnce));
    nextTimes(3);
    assert.equal(marked(fake, lang), "exitButton");
    for (let step = 0; step < 4; step++) press(fake, "Prev");
    assert.deepEqual(marked(fake, lang), { row: "10" }, "Prev from the view buttons comes back to the last row");
    for (let index = ROW_INITIALS.length - 2; index >= 0; index--) {
        press(fake, "Prev");
        const first = Math.min(index, ROW_INITIALS.length - shownAtOnce);
        assert.deepEqual(rowsInView(), ROW_INITIALS.slice(first, first + shownAtOnce), `back up to row ${ROW_INITIALS[index]}`);
    }
    press(fake, "Exit");

    setBoard(MEDIEVAL, FACTORY);
    await openRead();
    assert.deepEqual(rowsInView(), ["ZAP", "RCF"]);
    nextTimes(4);
    assert.deepEqual(marked(fake, lang), { view: VIEWS.table }, "rows that all fit are left out");
    press(fake, "Exit");

    fake.setLayoutSize({ width: 1080, height: 1920 });
    setBoard(MEDIEVAL, TEN_PLACES);
    await openRead();
    assert.deepEqual(rowsInView(), ROW_INITIALS, "a portrait window shows every place");
    nextTimes(4);
    assert.deepEqual(marked(fake, lang), { view: VIEWS.table });
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
