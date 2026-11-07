// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: a table whose ROM is unknown at launch, then one whose .nv
// does not exist yet at launch, give no Play Score, logged; a table
// without ROM whose game changes no .nv logs nothing about Play Scores.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, MEDIEVAL, AFM, ZELDA, ZELDA_TABLE, VPX_TABLES, lastGame, withGameFile } from "./high_scores_scenario.js";

test("an unknown ROM or a .nv missing at launch gives no Play Score, logged", async () => {
    const [medieval, afm] = VPX_TABLES;
    const { fake, play, personalBoard, log } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: [{ ...medieval, rom: "" }, afm, withGameFile(ZELDA_TABLE)],
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });

    await play(MEDIEVAL, { nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });
    await play(AFM, { nvAfter: { afm_113b: lastGame([4250000, 0, 0, 0]) } });
    await play(ZELDA);

    assert.deepEqual(await personalBoard(MEDIEVAL, "Alice"), []);
    assert.deepEqual(await personalBoard(AFM, "Alice"), []);
    assert.deepEqual(log().filter(line => line.includes("Play Score")), [
        `[HighScores] "${MEDIEVAL}": no Play Score for Alice: the table's ROM was unknown at launch.`,
        `[HighScores] "${AFM}": no Play Score for Alice: C:\\vPinball\\VisualPinball\\VPinMAME\\nvram\\afm_113b.nv did not exist at launch.`,
    ]);
    assertNoErrorLogged(fake);
});
