// ============================================================
// The High Score Board on the Drawn Screen controls, through main.js on the
// fake PinballY globals: a held Select, Launch or Exit counts once, so the
// board just opened stays; a held flipper keeps moving the marker; Select and Launch
// on a view button turn the view, Exit goes back to the main menu; attract mode closes it, its Loader and
// crowns hidden.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { loaderLayerCount, readLoader } from "../support/loader_reader.js";
import { startHighScores, board, MEDIEVAL } from "./high_scores_scenario.js";
import { hold } from "../stats/profile_stats_reader.js";
import { openBoard, press, isBoardOpen, boardLayerCount, rows, viewName, marked, crownsWaitHidden, BOARD_OPEN_MS } from "./high_score_board_reader.js";

const TEN_PLACES = board(
    ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"], ["RCF", "10000000"],
    ["DTW", "9000000"], ["CPG", "8000000"], ["JAB", "7000000"], ["MRP", "6000000"], ["KOZ", "5000000"],
);

test("the High Score Board counts a held Select, Launch or Exit once, moves its marker on a held flipper, turns its view on Select and Launch, and goes with attract mode", async () => {
    const { fake, setBoard } = await startHighScores({ profiles: { Alice: {} }, active: "Alice" });
    const { default: lang } = await import("../../common/core/i18n.js");
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    const selectedEntry = () => fake.currentMenu().items.filter(item => item.selected).map(item => item.title);
    const firstRowInView = () => rows(fake, lang)[0].initials;

    setBoard(MEDIEVAL, TEN_PLACES);
    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    for (const button of ["Select", "Launch", "Exit"]) {
        assert.ok(hold(fake, button).defaultPrevented, `a held ${button} never reaches the wheel`);
        assert.ok(isBoardOpen(fake), `a held ${button} leaves the board open`);
    }
    assert.equal(marked(fake, lang), "exitButton");
    assert.ok(hold(fake, "Next").defaultPrevented);
    hold(fake, "Next");
    assert.deepEqual(marked(fake, lang), { row: "5" }, "a held flipper keeps moving the marker");
    hold(fake, "Prev");
    assert.deepEqual(marked(fake, lang), { row: "4" });
    assert.equal(firstRowInView(), "ZAP");

    for (let guard = 0; guard < 20 && !marked(fake, lang).view; guard++) press(fake, "Next");
    // The marker stays on the first button, which names the Table Board once on the Household Board.
    for (const [button, view] of [["Select", "household"], ["Launch", "table"]]) {
        assert.ok(press(fake, button).defaultPrevented);
        assert.ok(isBoardOpen(fake), `${button} turns the view, the board stays`);
        assert.equal(viewName(fake), lang.highScores.board.views[view], `${button} on a view button turns to its view`);
    }
    assert.ok(press(fake, "Exit").defaultPrevented);
    assert.equal(boardLayerCount(fake), 0, "Exit closes the board");
    assert.deepEqual(selectedEntry(), ["High Scores"], "Exit goes back to the main menu on the entry");
    fake.closeMenu();

    // Read again, slowly: the Loader turns above the board.
    setBoard(MEDIEVAL, TEN_PLACES, { durationMs: 5000 });
    openBoard(fake, lang);
    assert.equal(readLoader(fake).shown, true);
    fake.enterAttractMode();
    assert.equal(boardLayerCount(fake), 0);
    assert.equal(loaderLayerCount(fake), 0, "the Loader goes with it");
    assert.ok(crownsWaitHidden(fake), "the crowns too");
    assert.equal(fake.currentMenu(), null, "nothing brought back");
    assert.ok(!press(fake, "Next").defaultPrevented, "the buttons are the wheel's again");
    fake.advanceTime(5000);
    await settle();
    fake.advanceTime(BOARD_OPEN_MS);
    assertNoErrorLogged(fake);
});
