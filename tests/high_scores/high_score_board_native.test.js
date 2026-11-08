// ============================================================
// The High Score Board replacing PinballY's "High Scores", with Menu Cleanup
// on and native menus: only the pack's entry, the HighScores button opens
// the drawn board, Exit goes back to the wheel; over a menu it does nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startHighScores, MEDIEVAL, FACTORY } from "./high_scores_scenario.js";
import { mainMenuTitles, press, isBoardOpen, boardLayerCount, title, podium, BOARD_OPEN_MS } from "./high_score_board_reader.js";

test("PinballY's own High Scores entry is gone; the HighScores button opens the drawn board, Exit back to the wheel", async () => {
    const { fake, setBoard } = await startHighScores({ addOns: ["highScores", "menuCleanup"] });
    const { default: lang } = await import("../../common/core/i18n.js");
    const HIGH_SCORES = globalThis.command.HighScores;

    const { titles, boardEntry } = mainMenuTitles(fake);
    assert.equal(titles.filter(entry => entry === "High Score Boards").length, 1);
    assert.equal(titles.includes("High Scores"), false, titles.join(" | "));
    assert.notEqual(boardEntry, -1);

    fake.openMainMenu();
    fake.runCommand(HIGH_SCORES);
    assert.ok(!isBoardOpen(fake), "never over a menu");
    assert.notEqual(fake.currentMenu(), null);
    fake.closeMenu();

    setBoard(MEDIEVAL, FACTORY, { durationMs: 100 });
    fake.runCommand(HIGH_SCORES);
    fake.advanceTime(BOARD_OPEN_MS);
    await settle();
    assert.ok(!fake.executedCommands().includes(HIGH_SCORES), "PinballY's window never opens");
    assert.ok(isBoardOpen(fake));
    assert.equal(title(fake), "Medieval Madness");
    assert.equal(podium(fake, lang).middle.rank, "1");

    assert.ok(press(fake, "Exit").defaultPrevented);
    assert.equal(boardLayerCount(fake), 0);
    assert.equal(fake.currentMenu(), null);
    assert.ok(!fake.executedCommands().includes(globalThis.command.ShowMainMenu), "straight back to the wheel");
    assert.ok(!press(fake, "Next").defaultPrevented, "the buttons are the wheel's again");
});
