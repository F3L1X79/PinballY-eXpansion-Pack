// ============================================================
// The High Score Board's Exit Button opened from the main menu, through
// main.js on the fake PinballY globals: the back arrow, its tooltip saying
// Back once the Selection Marker is on it; the footer names the flippers
// (Browse), Select (Choose) and Exit (Back); Exit reopens the main menu
// on the board's entry.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startHighScores, MEDIEVAL, FACTORY } from "./high_scores_scenario.js";
import { openBoard, press, isBoardOpen, boardLayerCount, buttonHints, exitButtonTooltip, marked } from "./high_score_board_reader.js";
import { expectedButtonHints } from "../support/button_hints_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("from the main menu: the back arrow's Back, and Exit back to the main menu on the entry", async () => {
    const { fake, setBoard } = await startHighScores();
    const { default: lang } = await import("../../common/core/i18n.js");
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    setBoard(MEDIEVAL, FACTORY, { durationMs: 100 });

    openBoard(fake, lang);
    await settle();
    press(fake, "Prev");
    assert.equal(marked(fake, lang), "exitButton");
    assert.equal(exitButtonTooltip(fake), lang.buttonHints.back);
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { exit: "back" }));

    assert.ok(press(fake, "Exit").defaultPrevented, "Exit never reaches the wheel");
    assert.ok(!isBoardOpen(fake), "Exit leaves the board");
    assert.equal(boardLayerCount(fake), 0);
    assert.deepEqual(fake.currentMenu().items.filter(item => item.selected).map(item => item.title), ["High Score Boards"]);
    fake.closeMenu();
    assertNoErrorLogged(fake);
});
