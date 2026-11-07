// ============================================================
// Play Scores, through main.js on the fake PinballY globals with vpxtool
// installed: Guest's Personal Board gets its Play Scores, a Profile Reset
// leaves only the Play Scores made since, and a removed Profile's Play
// Scores are skipped until a Profile of that name comes back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, PROFILES_FOLDER, lastGame } from "./high_scores_scenario.js";

test("Guest gets its Play Scores; a Profile Reset and a removed Profile drop theirs", async () => {
    const { fake, setBoard, play, personalBoard, switchTo, resetProfile } = await startHighScores({
        profiles: { Alice: {} }, active: "guest", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([0, 0, 0, 0]) },
    });
    const scoresOf = async name => (await personalBoard(MEDIEVAL, name)).map(place => place.score);
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([1500000, 0, 0, 0]) } });
    assert.deepEqual(await scoresOf("guest"), [1500000]);

    switchTo("Alice");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([2500000, 0, 0, 0]) } });
    resetProfile("Alice");
    assert.deepEqual(await scoresOf("Alice"), [], "a Play Score made before the reset no longer counts");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([2000000, 0, 0, 0]) } });
    assert.deepEqual(await scoresOf("Alice"), [2000000], "one made since counts");

    fake.removeFolder(`${PROFILES_FOLDER}\\Alice`);
    assert.deepEqual(await scoresOf("Alice"), [], "a removed Profile's Play Scores are skipped");
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [] }));
    assert.deepEqual(await scoresOf("Alice"), [2000000], "a Profile re-created under its name gets them back");
    assert.deepEqual(await scoresOf("guest"), [1500000]);
    assertNoErrorLogged(fake);
});
