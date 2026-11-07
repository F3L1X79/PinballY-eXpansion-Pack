// ============================================================
// The High Score Board's Household Board with no one's High Score on it,
// through main.js on the fake PinballY globals: on a table whose high
// scores are not supported, the Table Board keeps its message and the
// Household Board says no one in the household has a high score there.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, MEDIEVAL, NOT_SUPPORTED } from "./high_scores_scenario.js";
import { openBoard, press, message, note, viewName, podium } from "./high_score_board_reader.js";

test("an unsupported table's Household Board says no one in the household has a high score there", async () => {
    const { fake, setBoard } = await startHighScores({ profiles: { Alice: {} }, active: "Alice" });
    const { default: lang } = await import("../../common/core/i18n.js");
    setBoard(MEDIEVAL, NOT_SUPPORTED);

    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    assert.equal(message(fake), "This table's high scores are not supported");

    press(fake, "Select");
    assert.equal(viewName(fake), "The household");
    assert.equal(message(fake), "No one in the household has a high score on this table yet");
    assert.equal(note(fake), null);
    assert.deepEqual(podium(fake, lang), { left: null, middle: null, right: null });

    press(fake, "Select");
    assert.equal(message(fake), "This table's high scores are not supported", "the Table Board keeps its message");
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
