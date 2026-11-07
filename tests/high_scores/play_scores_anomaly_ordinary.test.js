// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: the rules working write nothing, no file at all: a
// Play Score kept, a WPC quit (game_over false), a launch without a game
// and a game under a minute.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, ANOMALY_LOG, lastGame } from "./high_scores_scenario.js";

test("ordinary Plays write no anomaly", async () => {
    const { fake, setBoard, play, personalBoard } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([1000000, 0, 0, 0], { gameOver: false }) } });
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([4250000, 0, 0, 0]) }, durationMs: 50 * 1000 });

    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [3125000]);
    assert.equal(fake.readFile(ANOMALY_LOG), undefined);
    assertNoErrorLogged(fake);
});
