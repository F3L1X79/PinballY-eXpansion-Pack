// ============================================================
// Play Scores on the Household Board, through main.js on the fake PinballY
// globals with vpxtool installed: Guest's Play Scores never show there, a
// Profile Reset leaves only the Play Scores made since, and a removed
// Profile's are skipped until a Profile of that name comes back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, PROFILES_FOLDER, lastGame } from "./high_scores_scenario.js";

test("Guest stays off the Household Board; a Profile Reset and a removed Profile drop their Play Scores", async () => {
    const { fake, setBoard, play, switchTo, resetProfile, householdBoard } = await startHighScores({
        profiles: { Alice: {}, Bob: {} }, active: "guest", tables: VPX_TABLES,
        vpxtool: true, nvFiles: { mm_109c: lastGame([0, 0, 0, 0]) },
    });
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([9000000, 0, 0, 0]) } });
    assert.deepEqual(await householdBoard(MEDIEVAL), [], "Guest's Play Score never shows");

    switchTo("Alice");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3000000, 0, 0, 0]) } });
    switchTo("Bob");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([2000000, 0, 0, 0]) } });
    assert.deepEqual(await householdBoard(MEDIEVAL), [["Alice", 3000000], ["Bob", 2000000]]);

    resetProfile("Alice");
    assert.deepEqual(await householdBoard(MEDIEVAL), [["Bob", 2000000]], "a Play Score made before the reset no longer counts");
    switchTo("Alice");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([1000000, 0, 0, 0]) } });
    assert.deepEqual(await householdBoard(MEDIEVAL), [["Bob", 2000000], ["Alice", 1000000]], "one made since counts");

    fake.removeFolder(`${PROFILES_FOLDER}\\Bob`);
    assert.deepEqual(await householdBoard(MEDIEVAL), [["Alice", 1000000]], "a removed Profile's Play Scores are skipped");
    fake.addFile(`${PROFILES_FOLDER}\\Bob\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [] }));
    assert.deepEqual(await householdBoard(MEDIEVAL), [["Bob", 2000000], ["Alice", 1000000]], "a Profile re-created under its name gets them back");
    assertNoErrorLogged(fake);
});
