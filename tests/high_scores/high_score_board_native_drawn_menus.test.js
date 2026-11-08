// ============================================================
// The High Score Board replacing PinballY's "High Scores", with Drawn Menus on
// and Menu Cleanup off: only the pack's entry, no doubled separator, and
// the HighScores button opens the board, Exit going back to the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startHighScores, MEDIEVAL, FACTORY } from "./high_scores_scenario.js";
import { press, isBoardOpen, boardLayerCount, title, BOARD_OPEN_MS } from "./high_score_board_reader.js";
import { isDrawnMenuShown, drawnMenuLines, openMainMenu, openMenu, press as pressInMenu } from "../drawn_menu/drawn_menu_reader.js";

test("with the Drawn Menus, one High Score Boards entry and no High Scores; the HighScores button opens the drawn board", async () => {
    const { fake, setBoard } = await startHighScores({ addOns: ["highScores", "drawnMenus"] });
    const { command } = globalThis;

    openMainMenu(fake);
    assert.equal(drawnMenuLines(fake).filter(line => line === "High Score Boards").length, 1);
    assert.equal(drawnMenuLines(fake).includes("High Scores"), false);
    pressInMenu(fake, "Exit");
    assert.ok(!isDrawnMenuShown(fake));

    openMenu(fake, "main", [
        { title: "Play", cmd: command.PlayGame },
        { title: "", cmd: -1 },
        { title: "High Scores", cmd: command.HighScores },
        { title: "", cmd: -1 },
        { title: "Rate Table", cmd: command.RateGame },
    ]);
    assert.deepEqual(drawnMenuLines(fake), ["Play", "---", "High Score Boards", "Rate Table"]);
    pressInMenu(fake, "Exit");

    setBoard(MEDIEVAL, FACTORY, { durationMs: 100 });
    fake.runCommand(command.HighScores);
    fake.advanceTime(BOARD_OPEN_MS);
    await settle();
    assert.ok(!fake.executedCommands().includes(command.HighScores), "PinballY's window never opens");
    assert.ok(isBoardOpen(fake));
    assert.equal(title(fake), "Medieval Madness");

    assert.ok(press(fake, "Exit").defaultPrevented);
    fake.advanceTime(BOARD_OPEN_MS);
    assert.equal(boardLayerCount(fake), 0);
    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu(), null);
    assert.ok(!press(fake, "Next").defaultPrevented, "the buttons are the wheel's again");
});
