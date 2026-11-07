// ============================================================
// The High Score Board's views, through main.js on the fake PinballY
// globals: it opens on the Table Board, Select turns to the Household
// Board and back, the view's name shows under the table's title and the
// Select hint names the next view; Exit closes from either view.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { expectedButtonHints } from "../support/button_hints_reader.js";
import { startHighScores, FACTORY, MEDIEVAL } from "./high_scores_scenario.js";
import { openBoard, press, isBoardOpen, boardLayerCount, title, viewName, buttonHints, podium } from "./high_score_board_reader.js";

test("Select turns the High Score Board from the Table Board to the Household Board and back; Exit closes from either", async () => {
    const { fake, setBoard } = await startHighScores({ profiles: { Alice: {} }, active: "Alice" });
    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.highScores.board;
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    setBoard(MEDIEVAL, FACTORY);

    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    assert.equal(title(fake), "Medieval Madness");
    assert.equal(viewName(fake), "The table");
    assert.equal(podium(fake, lang).middle.initials, "SLL");
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { flippers: null, select: TEXT.views.household, exit: "back" }));

    assert.ok(press(fake, "Select").defaultPrevented);
    assert.ok(isBoardOpen(fake), "Select keeps the board open");
    assert.equal(title(fake), "Medieval Madness");
    assert.equal(viewName(fake), "The household");
    assert.equal(podium(fake, lang).middle, null, "no Profile has a High Score here");
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { flippers: null, select: TEXT.views.table, exit: "back" }));

    press(fake, "Select");
    assert.equal(viewName(fake), "The table");
    assert.equal(podium(fake, lang).middle.initials, "SLL");

    press(fake, "Select");
    press(fake, "Exit");
    assert.equal(boardLayerCount(fake), 0, "Exit closes from the Household Board");
    assert.deepEqual(fake.currentMenu().items.filter(item => item.selected).map(item => item.title), ["High Scores"]);
    fake.closeMenu();

    openBoard(fake, lang);
    await settle();
    assert.equal(viewName(fake), "The table", "every opening starts on the Table Board");
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
