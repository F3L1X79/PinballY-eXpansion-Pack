// ============================================================
// The High Score Board's views scrolled, through main.js on the fake
// PinballY globals: the flippers walk and scroll a Household Board longer than the
// window, and each view starts scrolled to its top.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, MEDIEVAL } from "./high_scores_scenario.js";
import { openBoard, press, showView, marked, rows, viewPlaces, panelHeight } from "./high_score_board_reader.js";

const PLAYERS = ["Ann", "Ben", "Cat", "Dan", "Eve", "Fay"];

test("the flippers scroll a long Household Board; each view starts at its top", async () => {
    const { fake, setBoard, play, switchTo } = await startHighScores({
        profiles: Object.fromEntries(PLAYERS.map(name => [name, {}])), active: "Ann",
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    // Each player in turn tops the board, which keeps every place.
    const entries = [];
    setBoard(MEDIEVAL, board(["SLL", "1000000"]));
    for (const [index, name] of PLAYERS.entries()) {
        switchTo(name);
        entries.unshift([name.toUpperCase(), String((index + 2) * 1000000)]);
        await play(MEDIEVAL, { after: board(...entries, ["SLL", "1000000"]) });
    }
    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    const firstRowInView = () => rows(fake, lang)[0].rank;
    // Next until the marker is on the row of that rank.
    const walkToRow = (rank) => {
        for (let guard = 0; guard < 20 && marked(fake, lang).row !== rank; guard++) press(fake, "Next");
        assert.deepEqual(marked(fake, lang), { row: rank });
    };

    assert.equal(firstRowInView(), "4");
    walkToRow("7");
    assert.notEqual(firstRowInView(), "4", "the Table Board scrolls");
    assert.equal(rows(fake, lang).at(-1).rank, "7");

    const tableHeight = panelHeight(fake);
    showView(fake, lang, "household");
    assert.equal(panelHeight(fake), tableHeight, "the shorter Household Board keeps the Table Board's size");
    assert.deepEqual(viewPlaces(fake, lang).slice(0, 4).map(place => [place.rank, place.name]), [["1", "Fay"], ["2", "Eve"], ["3", "Dan"], ["4", "Cat"]],
        "the Household Board starts at its top");
    walkToRow("6");
    assert.notEqual(firstRowInView(), "4", "the flippers scroll the Household Board");
    assert.equal(rows(fake, lang).at(-1).name, "Ann");

    showView(fake, lang, "table");
    assert.equal(firstRowInView(), "4", "the Table Board starts at its top again");
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
