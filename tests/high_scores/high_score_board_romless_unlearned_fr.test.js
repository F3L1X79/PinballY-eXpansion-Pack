// ============================================================
// The High Score Board of an unlearned original table in French, through
// main.js on the fake PinballY globals: the message asking for a game
// reads in French.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startHighScores, ZELDA_TABLE } from "./high_scores_scenario.js";
import { openBoard, message } from "./high_score_board_reader.js";

test("an unlearned original table asks for a game in French", async () => {
    const { fake } = await startHighScores({ tables: [ZELDA_TABLE], language: "fr" });
    const { default: lang } = await import("../../common/core/i18n.js");

    openBoard(fake, lang);
    fake.advanceTime(1000);
    await settle();

    assert.equal(message(fake), "Jouez une partie d'au moins une minute pour afficher les meilleurs scores de cette table");
});
