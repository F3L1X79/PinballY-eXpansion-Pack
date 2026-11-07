// ============================================================
// The High Score Board's Household Board in French, through main.js on the
// fake PinballY globals: the views' names under the title and on the
// view buttons, whole and at one size, a place's date day first, and the empty Household Board's
// message.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, avatarFiles } from "./high_scores_scenario.js";
import { openBoard, press, showView, viewName, viewPlaces, viewButtons, viewButtonLabels, currentViewButton, message } from "./high_score_board_reader.js";

test("the Household Board speaks French", async () => {
    const { fake, setBoard, play } = await startHighScores({ profiles: { Alice: {} }, active: "Alice", files: avatarFiles("Alice"), language: "fr" });
    const { default: lang } = await import("../../common/core/i18n.js");
    const open = async () => {
        openBoard(fake, lang);
        await settle();
        fake.advanceTime(1000);
        await settle();
    };
    setBoard(MEDIEVAL, FACTORY);
    await open();
    assert.equal(viewName(fake), "Scores de la ROM");
    assert.deepEqual(viewButtons(fake), ["Scores de la ROM", "Scores de la maison", "Vos 5 meilleurs scores"], "whole, never cut");
    const { sizes, inside } = viewButtonLabels(fake);
    assert.equal(new Set(sizes).size, 1, `the three labels at one size (${sizes})`);
    assert.ok(inside, "each within its button");
    showView(fake, lang, "household");
    assert.equal(viewName(fake), "Scores de la maison");
    assert.equal(message(fake), "Aucun joueur de la maison n'a encore de meilleur score sur cette table");
    assert.equal(currentViewButton(fake), "Scores de la maison");
    press(fake, "Exit");

    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]) });
    await open();
    showView(fake, lang, "household");
    assert.deepEqual(viewPlaces(fake, lang).map(place => [place.rank, place.name, place.date]), [["1", "Alice", "12/10/2026"]]);
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
