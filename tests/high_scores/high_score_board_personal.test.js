// ============================================================
// The High Score Board's Personal Board, through main.js on the fake
// PinballY globals: its button opens it, and the Table Board's turns back; the
// active Profile's five best High Scores on the table since its last
// Profile Reset, those pushed off the table's board and each place of a
// multiplayer game included, Default Scores never, equal scores the older first.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, avatarOf, avatarFiles } from "./high_scores_scenario.js";
import { openBoard, press, showView, viewName, viewPlaces, currentViewButton, message } from "./high_score_board_reader.js";

const DAY_MS = 24 * 60 * 60 * 1000;

test("the Personal Board shows the active Profile's five best High Scores on the table since its last Profile Reset", async () => {
    const { fake, setBoard, play, resetProfile } = await startHighScores({ profiles: { Alice: {} }, active: "Alice", files: avatarFiles("Alice") });
    const { default: lang } = await import("../../common/core/i18n.js");
    const VIEWS = lang.highScores.board.views;
    setBoard(MEDIEVAL, FACTORY);
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"], ["ALI", "15000000"]) });
    resetProfile("Alice");
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ALI", "25000000"], ["ZAP", "20000000"]) });
    // A multiplayer game: both new places are Alice's.
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["BRE", "40000000"], ["ALI", "35000000"], ["ALI", "33000000"], ["LFS", "30000000"]) });
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["ALI", "35000000"], ["ALI", "33000000"]) });
    // The next day: her 33,000,000, then her second 35,000,000 are pushed off the table's board.
    fake.advanceTime(DAY_MS);
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["ALI", "35000000"], ["AL2", "35000000"]) });
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "50000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["ALI", "35000000"]) });

    fake.setLayoutSize({ width: 1080, height: 1920 });
    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    showView(fake, lang, "personal");
    assert.equal(viewName(fake), "My best 5");
    assert.equal(currentViewButton(fake), VIEWS.personal);
    assert.equal(message(fake), null);
    const alice = (rank, score, date) => ({ rank, name: "Alice", avatar: avatarOf("Alice"), score, date });
    assert.deepEqual(viewPlaces(fake, lang), [
        alice("1", "50,000,000", "10/13/2026"),
        alice("2", "45,000,000", "10/12/2026"),
        alice("3", "35,000,000", "10/12/2026"),
        alice("4", "35,000,000", "10/13/2026"),
        alice("5", "33,000,000", "10/12/2026"),
    ]);

    showView(fake, lang, "table");
    assert.equal(viewName(fake), "The table", "its button turns back to the Table Board");
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
