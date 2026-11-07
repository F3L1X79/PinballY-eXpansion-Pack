// ============================================================
// The High Score Board's fresh read seen from the Household Board, through
// main.js on the fake PinballY globals: the "Reading…" note and the Loader
// show on the Table Board only; a read ending while the Household Board is
// on show leaves it drawn, and its button brings back the fresh Table Board.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readLoader } from "../support/loader_reader.js";
import { startHighScores, board, FACTORY, MEDIEVAL } from "./high_scores_scenario.js";
import { openBoard, press, showView, note, viewName, podium, BOARD_OPEN_MS } from "./high_score_board_reader.js";

test("a read ending while the Household Board is on show leaves it drawn; the Table Board comes back fresh", async () => {
    const { fake, setBoard } = await startHighScores({ profiles: { Alice: {} }, active: "Alice" });
    const { default: lang } = await import("../../common/core/i18n.js");
    setBoard(MEDIEVAL, FACTORY);
    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    press(fake, "Exit");

    // Read again, slowly, the board changed outside the pack meanwhile.
    setBoard(MEDIEVAL, board(["XYZ", "90000000"], ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]), { durationMs: 5000 });
    openBoard(fake, lang);
    assert.equal(note(fake), lang.highScores.board.reading);
    assert.equal(readLoader(fake).shown, true);

    showView(fake, lang, "household");
    assert.equal(viewName(fake), "The household");
    assert.equal(note(fake), null, "no note on the Household Board");
    assert.equal(readLoader(fake).shown, false, "nor the Loader");

    fake.advanceTime(5000);
    await settle();
    fake.advanceTime(BOARD_OPEN_MS);
    assert.equal(viewName(fake), "The household", "the read leaves the Household Board drawn");
    assert.equal(note(fake), null);

    showView(fake, lang, "personal");
    assert.equal(note(fake), null, "nor on the Personal Board");
    showView(fake, lang, "table");
    assert.equal(viewName(fake), "The table");
    assert.equal(podium(fake, lang).middle.initials, "XYZ", "the fresh board");
    assert.equal(note(fake), null);
    assert.equal(readLoader(fake).shown, false);
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
