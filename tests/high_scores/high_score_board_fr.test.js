// ============================================================
// The High Score Board in French, through main.js on the fake PinballY
// globals: its entry, with no "Meilleurs scores" beside it, "Score par défaut", the scores' thousands separated
// by a no-break space, "Lecture…" while the board is read, "Pas encore
// de score" on an empty board and the long "not supported" message whole.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startHighScores, FACTORY, EMPTY_BOARD, NOT_SUPPORTED, MEDIEVAL, AFM } from "./high_scores_scenario.js";
import { openBoard, press, podium, message, mainMenuTitles, BOARD_OPEN_MS } from "./high_score_board_reader.js";

test("the board speaks French", async () => {
    // UI Translation on, Menu Cleanup off: PinballY's own High Scores would read "Meilleurs scores" too.
    const { fake, setBoard, play } = await startHighScores({ language: "fr", addOns: ["highScores", "uiTranslation"] });
    const { default: lang } = await import("../../common/core/i18n.js");
    setBoard(MEDIEVAL, FACTORY);
    await play(MEDIEVAL, { after: FACTORY });

    assert.equal(lang.highScores.board.menuEntry, "Tableaux des meilleurs scores");
    const { titles } = mainMenuTitles(fake);
    assert.equal(titles.filter(title => title === "Tableaux des meilleurs scores").length, 1, titles.join(" | "));
    assert.equal(titles.includes("Meilleurs scores"), false, titles.join(" | "));
    openBoard(fake, lang);
    const { middle } = podium(fake, lang);
    assert.deepEqual([middle.name, middle.score], ["Score par défaut", "52 000 000"]);
    press(fake, "Exit");
    fake.advanceTime(BOARD_OPEN_MS);

    fake.setWheelGame(1);
    assert.equal(fake.getCurrentTable().configId, AFM);
    setBoard(AFM, EMPTY_BOARD, { durationMs: 2000 });
    openBoard(fake, lang);
    assert.equal(message(fake), "Lecture\u2026");
    fake.advanceTime(2000);
    await settle();
    assert.equal(message(fake), "Pas encore de score");
    press(fake, "Exit");
    fake.advanceTime(BOARD_OPEN_MS);

    setBoard(AFM, NOT_SUPPORTED);
    openBoard(fake, lang);
    fake.advanceTime(1000);
    await settle();
    assert.equal(message(fake), "Les meilleurs scores de cette table ne sont pas pris en charge");
});
