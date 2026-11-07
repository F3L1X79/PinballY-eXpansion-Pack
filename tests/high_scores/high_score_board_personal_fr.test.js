// ============================================================
// The High Score Board's Personal Board in French, through main.js on the
// fake PinballY globals: its name under the title and in the Household
// Board's Select hint, its empty message, a place's date day first.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, avatarFiles } from "./high_scores_scenario.js";
import { openBoard, press, viewName, viewPlaces, buttonHints, message, BOARD_OPEN_MS } from "./high_score_board_reader.js";

test("the Personal Board speaks French", async () => {
    const { fake, setBoard, play } = await startHighScores({ profiles: { Alice: {} }, active: "Alice", files: avatarFiles("Alice"), language: "fr" });
    const { default: lang } = await import("../../common/core/i18n.js");
    const openPersonal = async () => {
        openBoard(fake, lang);
        await settle();
        fake.advanceTime(1000);
        await settle();
        press(fake, "Select");
        assert.deepEqual(buttonHints(fake).at(-2), { keys: ["SELECT"], label: "MES 5 MEILLEURS" });
        press(fake, "Select");
        assert.equal(viewName(fake), "Mes 5 meilleurs");
    };
    setBoard(MEDIEVAL, FACTORY);
    await openPersonal();
    assert.equal(message(fake), "Entrez au tableau de cette table pour y voir vos meilleurs scores");
    press(fake, "Exit");
    fake.advanceTime(BOARD_OPEN_MS);

    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]) });
    await openPersonal();
    assert.deepEqual(viewPlaces(fake, lang).map(place => [place.rank, place.name, place.date]), [["1", "Alice", "12/10/2026"]]);
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
