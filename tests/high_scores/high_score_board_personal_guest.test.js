// ============================================================
// The High Score Board's Personal Board with Guest active, through main.js
// on the fake PinballY globals: empty, it asks to get onto the table's
// board; once Guest has a High Score there, Guest's own place shows.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, avatarOf, avatarFiles } from "./high_scores_scenario.js";
import { openBoard, press, showView, viewName, viewPlaces, message, BOARD_OPEN_MS } from "./high_score_board_reader.js";

test("with Guest active, the Personal Board is Guest's", async () => {
    const { fake, setBoard, play } = await startHighScores({ profiles: { Alice: {} }, active: "guest", files: avatarFiles("guest") });
    const { default: lang } = await import("../../common/core/i18n.js");
    const openPersonal = async () => {
        openBoard(fake, lang);
        await settle();
        fake.advanceTime(1000);
        await settle();
        showView(fake, lang, "personal");
        assert.equal(viewName(fake), "Your 5 best scores");
    };
    setBoard(MEDIEVAL, FACTORY);
    await openPersonal();
    assert.equal(message(fake), "Get onto this table's board to see your best scores here");
    press(fake, "Exit");
    fake.advanceTime(BOARD_OPEN_MS);

    await play(MEDIEVAL, { after: board(["GST", "60000000"], ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]) });
    await openPersonal();
    assert.equal(message(fake), null);
    assert.deepEqual(viewPlaces(fake, lang), [{ rank: "1", name: lang.profiles.guestName, avatar: avatarOf("guest"), score: "60,000,000", date: "10/12/2026" }]);
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
