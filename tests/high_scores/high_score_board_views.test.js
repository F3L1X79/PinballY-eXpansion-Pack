// ============================================================
// The High Score Board's views, through main.js on the fake PinballY
// globals: one button per view, the view on show's in gold; it opens on the
// Table Board with the marker on the leftmost button; the flippers walk the
// buttons and the Exit Button; Select on a button turns to its view, on the view
// on show's does nothing, on the Exit Button goes back; each view keeps the longest's size.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { expectedButtonHints } from "../support/button_hints_reader.js";
import { startHighScores, FACTORY, MEDIEVAL } from "./high_scores_scenario.js";
import {
    openBoard, press, isBoardOpen, boardLayerCount, title, viewName, buttonHints, podium, message, viewButtons, currentViewButton, marked, exitButtonTooltip, panelHeight,
} from "./high_score_board_reader.js";

test("three buttons turn the High Score Board's views, the first selected on opening, every view the size of the longest", async () => {
    const { fake, setBoard } = await startHighScores({ profiles: { Alice: {} }, active: "Alice" });
    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.highScores.board;
    const ALL = [TEXT.views.table, TEXT.views.household, TEXT.views.personal];
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    setBoard(MEDIEVAL, FACTORY);

    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    assert.equal(title(fake), "Medieval Madness");
    assert.equal(viewName(fake), "The table");
    assert.equal(podium(fake, lang).middle.initials, "SLL");
    assert.deepEqual(viewButtons(fake), ALL);
    assert.equal(currentViewButton(fake), TEXT.views.table);
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { flippers: "browse", select: true, exit: "back" }));
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.table }, "opens on the leftmost button");
    assert.equal(exitButtonTooltip(fake), null, "the tooltip shows on the Exit Button only");
    const tableHeight = panelHeight(fake);

    assert.ok(press(fake, "Select").defaultPrevented);
    assert.equal(viewName(fake), "The table", "Select on the view on show's button does nothing");

    press(fake, "Next");
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.household });
    press(fake, "Next");
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.personal });
    press(fake, "Next");
    assert.equal(marked(fake, lang), "exitButton", "Next loops round to the Exit Button");
    assert.equal(exitButtonTooltip(fake), lang.buttonHints.back);
    press(fake, "Next");
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.table });
    press(fake, "Prev");
    assert.equal(marked(fake, lang), "exitButton", "Prev goes round the other way");

    press(fake, "Next");
    press(fake, "Next");
    assert.ok(press(fake, "Select").defaultPrevented);
    assert.ok(isBoardOpen(fake), "Select keeps the board open");
    assert.equal(title(fake), "Medieval Madness");
    assert.equal(viewName(fake), "The household");
    assert.equal(message(fake), TEXT.noHouseholdScore, "no Profile has a High Score here");
    assert.deepEqual(viewButtons(fake), ALL, "the buttons stay in place");
    assert.equal(currentViewButton(fake), TEXT.views.household);
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.household }, "the marker stays on the button");
    assert.equal(panelHeight(fake), tableHeight, "an empty view keeps the longest view's size");

    press(fake, "Next");
    press(fake, "Launch");
    assert.equal(viewName(fake), "My best 5", "Launch turns the view too");
    assert.equal(panelHeight(fake), tableHeight);

    press(fake, "Prev");
    press(fake, "Prev");
    press(fake, "Select");
    assert.equal(viewName(fake), "The table");
    assert.equal(podium(fake, lang).middle.initials, "SLL");

    press(fake, "Next");
    press(fake, "Select");
    press(fake, "Exit");
    assert.equal(boardLayerCount(fake), 0, "Exit closes from another view");
    assert.deepEqual(fake.currentMenu().items.filter(item => item.selected).map(item => item.title), ["High Scores"]);
    fake.closeMenu();

    openBoard(fake, lang);
    await settle();
    assert.equal(viewName(fake), "The table", "every opening starts on the Table Board");
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.table });
    press(fake, "Prev");
    assert.ok(press(fake, "Select").defaultPrevented);
    assert.equal(boardLayerCount(fake), 0, "Select on the Exit Button goes back");
    assert.deepEqual(fake.currentMenu().items.filter(item => item.selected).map(item => item.title), ["High Scores"]);
    fake.closeMenu();
    assertNoErrorLogged(fake);
});
