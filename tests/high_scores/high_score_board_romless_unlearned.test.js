// ============================================================
// The High Score Board of an original table never played since the pack
// learns boards, through main.js on the fake PinballY globals: PinballY
// reads no board for it and no VPReg.stg section or text file is learned
// yet, so the Table Board tells the player to play a game to bring up its
// high scores, not that they are not supported; the Household Board is just empty.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startHighScores, ZELDA_TABLE, ZELDA_FACTORY, OTHER_SECTIONS } from "./high_scores_scenario.js";
import { openBoard, press, message, note, podium } from "./high_score_board_reader.js";

test("an unlearned original table asks for a game to bring up its high scores", async () => {
    const { fake, setVpreg, saved } = await startHighScores({ tables: [ZELDA_TABLE] });
    const { default: lang } = await import("../../common/core/i18n.js");
    setVpreg({ ...OTHER_SECTIONS, ZELDA: ZELDA_FACTORY });

    openBoard(fake, lang);
    fake.advanceTime(1000);
    await settle();

    assert.equal(message(fake), "Play a game to bring up this table's high scores");
    assert.equal(note(fake), null);
    assert.deepEqual(podium(fake, lang), { left: null, middle: null, right: null });
    assert.equal(saved(), undefined);

    press(fake, "Select");
    assert.equal(message(fake), "No one in the household has a high score on this table yet", "its Household Board is just empty");
});
