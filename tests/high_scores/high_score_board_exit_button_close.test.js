// ============================================================
// The High Score Board's Exit Button opened by the dedicated HighScores
// button, through main.js on the fake PinballY globals: the cross, its
// tooltip saying Close once the Selection Marker is on it; the footer names the
// flippers (Browse), Select (Choose) and Exit (Close); Exit leaves the bare wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startHighScores, MEDIEVAL, FACTORY } from "./high_scores_scenario.js";
import { press, isBoardOpen, boardLayerCount, buttonHints, exitButtonTooltip, marked, BOARD_OPEN_MS } from "./high_score_board_reader.js";
import { expectedButtonHints } from "../support/button_hints_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("from the HighScores button: the cross's Close, and Exit back to the bare wheel", async () => {
    const { fake, setBoard } = await startHighScores();
    const { default: lang } = await import("../../common/core/i18n.js");
    setBoard(MEDIEVAL, FACTORY, { durationMs: 100 });

    fake.runCommand(globalThis.command.HighScores);
    fake.advanceTime(BOARD_OPEN_MS);
    await settle();
    press(fake, "Prev");
    assert.equal(marked(fake, lang), "exitButton");
    assert.equal(exitButtonTooltip(fake), lang.buttonHints.close);
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { exit: "close" }));

    assert.ok(press(fake, "Exit").defaultPrevented, "Exit never reaches the wheel");
    assert.ok(!isBoardOpen(fake), "Exit leaves the board");
    assert.equal(boardLayerCount(fake), 0);
    assert.equal(fake.currentMenu(), null);
    assert.ok(!fake.executedCommands().includes(globalThis.command.ShowMainMenu), "straight back to the wheel");
    assert.ok(!press(fake, "Next").defaultPrevented, "the buttons are the wheel's again");
    assertNoErrorLogged(fake);
});
