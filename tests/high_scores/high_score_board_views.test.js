// ============================================================
// The High Score Board's views, through main.js on the fake PinballY
// globals: it opens on the Table Board with the marker on the Exit Button;
// two buttons under it name the other views, the flippers walk Exit Button,
// first button, second button and round; Select on a button turns to its
// view, keeping the marker on that button; Select on the Exit Button goes back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { expectedButtonHints } from "../support/button_hints_reader.js";
import { startHighScores, FACTORY, MEDIEVAL } from "./high_scores_scenario.js";
import {
    openBoard, press, isBoardOpen, boardLayerCount, title, viewName, buttonHints, podium, viewButtons, marked, exitButtonTooltip,
} from "./high_score_board_reader.js";

test("two buttons turn the High Score Board to its other views; the flippers walk the Exit Button and both buttons", async () => {
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
    assert.deepEqual(viewButtons(fake), [TEXT.views.household, TEXT.views.personal]);
    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { flippers: "browse", select: true, exit: "back" }));
    assert.equal(marked(fake, lang), "exitButton", "opens on the Exit Button");
    assert.equal(exitButtonTooltip(fake), lang.buttonHints.back);

    assert.ok(press(fake, "Next").defaultPrevented);
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.household });
    assert.equal(exitButtonTooltip(fake), null, "the tooltip shows on the Exit Button only");
    press(fake, "Next");
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.personal });
    press(fake, "Next");
    assert.equal(marked(fake, lang), "exitButton", "Next loops back to the Exit Button");
    press(fake, "Prev");
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.personal }, "Prev goes round the other way");

    press(fake, "Prev");
    assert.ok(press(fake, "Select").defaultPrevented);
    assert.ok(isBoardOpen(fake), "Select keeps the board open");
    assert.equal(title(fake), "Medieval Madness");
    assert.equal(viewName(fake), "The household");
    assert.equal(podium(fake, lang).middle, null, "no Profile has a High Score here");
    assert.deepEqual(viewButtons(fake), [TEXT.views.table, TEXT.views.personal]);
    assert.deepEqual(marked(fake, lang), { view: TEXT.views.table }, "the marker stays on the first button");

    press(fake, "Next");
    press(fake, "Launch");
    assert.equal(viewName(fake), "My best 5", "Launch turns the view too");
    assert.deepEqual(viewButtons(fake), [TEXT.views.table, TEXT.views.household]);

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
    assert.equal(marked(fake, lang), "exitButton");
    assert.ok(press(fake, "Select").defaultPrevented);
    assert.equal(boardLayerCount(fake), 0, "Select on the Exit Button goes back");
    assert.deepEqual(fake.currentMenu().items.filter(item => item.selected).map(item => item.title), ["High Scores"]);
    fake.closeMenu();
    assertNoErrorLogged(fake);
});
