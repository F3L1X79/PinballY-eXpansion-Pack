// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: a Play that also enters the table's board shows once on the
// Personal Board, and Play Scores leave the Table Board, the Household
// Board, My High Scores, Table Records and Achievements as they were.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, VPX_TABLES, lastGame, highScoreIds } from "./high_scores_scenario.js";
import { getHighScoreStore } from "../../common/high_scores/high_score_store.js";

test("a Play that enters the board shows once; Play Scores count nowhere else", async () => {
    const { fake, setBoard, play, personalBoard, notified, showEveryToast } = await startHighScores({
        addOns: ["highScores", "achievementsEngine"], profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });
    const highScores = getHighScoreStore();
    assert.deepEqual(highScores.householdBoardOf(MEDIEVAL), [], "the Household Board keeps to High Scores");
    assert.deepEqual(highScores.heldBy("Alice"), { highScores: 0, tableRecords: 0 });
    assert.deepEqual(highScores.placesHeldBy("Alice"), []);
    assert.deepEqual(highScores.achievementCountsOf("Alice"), { highScoreTables: 0, tableRecordTables: 0, tookTableRecord: false, tookGrownUpTableRecord: false });
    assert.equal(highScores.boardOf(MEDIEVAL).some(place => place.owner !== null), false, "the Table Board keeps its Default Scores");
    await showEveryToast();
    assert.deepEqual(highScoreIds(notified("Alice")), []);

    await play(MEDIEVAL, {
        after: board(["SLL", "52000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]),
        nvAfter: { mm_109c: lastGame([45000000, 0, 0, 0]) },
    });
    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [45000000, 3125000]);
    assert.deepEqual(highScores.householdBoardOf(MEDIEVAL).map(place => place.score), [45000000]);
    assertNoErrorLogged(fake);
});
