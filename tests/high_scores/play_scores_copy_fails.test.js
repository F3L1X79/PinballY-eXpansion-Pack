// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: the .nv that cannot be copied at launch is logged as an error
// with the table, the Play gets no Play Score but keeps its High Score.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { startHighScores, FACTORY, SECOND_PLACE, MEDIEVAL, VPX_TABLES, lastGame, nvFileOf } from "./high_scores_scenario.js";

test("a .nv that cannot be copied at launch is logged, and the High Score credited", async () => {
    const { fake, setBoard, play, personalBoard, log } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    fake.failNextCopy();
    await play(MEDIEVAL, { after: SECOND_PLACE, nvAfter: { mm_109c: lastGame([45000000, 0, 0, 0]) } });

    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [45000000]);
    assert.deepEqual(errorLines(fake), [
        `[HighScores] ERROR "${MEDIEVAL}": ${nvFileOf("mm_109c")} could not be copied (Permission denied: C:\\PinballY\\Scripts\\ExpansionPack\\play_scores\\mm_109c.nv); no Play Score.`,
    ]);
    assert.deepEqual(log().filter(line => line.includes("no Play Score for")), []);
});
