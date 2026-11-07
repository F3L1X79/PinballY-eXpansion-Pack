// ============================================================
// Play Score anomaly log, through main.js on the fake PinballY globals with
// vpxtool installed: the same ROM refused as left unfinished on 3 Plays in a
// row writes one line, with the date, the table, the ROM and the game state
// before -> after; a Play Score in between starts the count again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, ANOMALY_LOG, lastGame } from "./high_scores_scenario.js";

test("3 unfinished Plays in a row write one line, a Play Score starting the count again", async () => {
    const { fake, setBoard, play, personalBoard, anomalies } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);
    const quit = score => ({ after: FACTORY, nvAfter: { mm_109c: lastGame([score, 0, 0, 0], { gameOver: false }) } });

    await play(MEDIEVAL, quit(1000000));
    await play(MEDIEVAL, quit(1100000));
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });
    await play(MEDIEVAL, quit(1200000));
    await play(MEDIEVAL, quit(1300000));
    assert.equal(anomalies(), undefined, "2 in a row since the Play Score: nothing yet");

    await play(MEDIEVAL, quit(1400000));
    await play(MEDIEVAL, quit(1500000));

    assert.deepEqual(anomalies(), [
        `"${MEDIEVAL}" mm_109c unfinishedInARow (3 Plays in a row): scores=[1300000,0,0,0] player_count=1 game_over=false -> scores=[1400000,0,0,0] player_count=1 game_over=false`,
    ]);
    assert.match(fake.readFile(ANOMALY_LOG), /^2026-10-12 \d\d:\d\d:\d\d "Medieval/, "local date and time first");
    assert.deepEqual((await personalBoard(MEDIEVAL, "Alice")).map(place => place.score), [3125000]);
    assertNoErrorLogged(fake);
});
