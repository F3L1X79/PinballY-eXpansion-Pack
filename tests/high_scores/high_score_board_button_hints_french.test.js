// ============================================================
// The High Score Board's Exit Button and Button Hints in French, through
// main.js on the fake PinballY globals: from the main menu, the tooltip
// says Retour and the footer "Gauche Droite Parcourir · Select Choisir · Exit Retour";
// from the HighScores button, Fermer and "… · Exit Fermer"; the view buttons name the other views.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../common/core/config.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the board's Exit Button and footer speak French", async () => {
    // Before anything reads the texts: the scenario's imports already do.
    config.language = "fr";
    const { startHighScores, board, MEDIEVAL, FACTORY } = await import("./high_scores_scenario.js");
    const { openBoard, press, buttonHints, exitButtonTooltip, viewButtons, BOARD_OPEN_MS } = await import("./high_score_board_reader.js");
    const { fake, setBoard } = await startHighScores({ language: "fr" });
    const { default: lang } = await import("../../common/core/i18n.js");
    const tenPlaces = board(
        ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"], ["RCF", "10000000"],
        ["DTW", "9000000"], ["CPG", "8000000"], ["JAB", "7000000"], ["MRP", "6000000"], ["KOZ", "5000000"],
    );

    setBoard(MEDIEVAL, tenPlaces);
    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    assert.equal(exitButtonTooltip(fake), "Retour");
    assert.deepEqual(viewButtons(fake), ["La maison", "Mes 5 meilleurs"]);
    assert.deepEqual(buttonHints(fake), [
        { keys: ["GAUCHE", "DROITE"], label: "PARCOURIR" },
        { keys: ["SELECT"], label: "CHOISIR" },
        { keys: ["EXIT"], label: "RETOUR" },
    ]);
    press(fake, "Exit");

    setBoard(MEDIEVAL, FACTORY, { durationMs: 100 });
    fake.runCommand(globalThis.command.HighScores);
    fake.advanceTime(BOARD_OPEN_MS);
    await settle();
    assert.equal(exitButtonTooltip(fake), "Fermer");
    assert.deepEqual(buttonHints(fake), [{ keys: ["GAUCHE", "DROITE"], label: "PARCOURIR" }, { keys: ["SELECT"], label: "CHOISIR" }, { keys: ["EXIT"], label: "FERMER" }]);
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
