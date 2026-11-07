// ============================================================
// The High Score Board's views scrolled, through main.js on the fake
// PinballY globals: the flippers scroll a Household Board longer than the
// window, and each view starts scrolled to its top.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { expectedButtonHints } from "../support/button_hints_reader.js";
import { startHighScores, board, MEDIEVAL } from "./high_scores_scenario.js";
import { openBoard, press, rows, viewPlaces, buttonHints } from "./high_score_board_reader.js";

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

    assert.equal(firstRowInView(), "4");
    press(fake, "Next");
    assert.equal(firstRowInView(), "5", "the Table Board scrolls");

    press(fake, "Select");
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { flippers: "scroll", select: lang.highScores.board.views.table, exit: "back" }));
    assert.deepEqual(viewPlaces(fake, lang).slice(0, 4).map(place => [place.rank, place.name]), [["1", "Fay"], ["2", "Eve"], ["3", "Dan"], ["4", "Cat"]],
        "the Household Board starts at its top");
    press(fake, "Next");
    assert.equal(firstRowInView(), "5", "the flippers scroll the Household Board");
    assert.equal(rows(fake, lang)[0].name, "Ben");

    press(fake, "Select");
    assert.equal(firstRowInView(), "4", "the Table Board starts at its top again");
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
