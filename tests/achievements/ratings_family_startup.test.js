// ============================================================
// The Ratings family at startup, through main.js on the fake PinballY
// globals: the Ratings already in the active Profile's file, tables gone
// from the game list included, unlock the first two steps, announced at
// once; the list shows the others' Achievement Progress; the ladder gives
// Bronze to Platinum.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startRatingsScenario, MEDIEVAL, MARS, THEATRE, GONE_TABLES } from "./ratings_family_scenario.js";
import { ACHIEVEMENT_RANK } from "../../common/achievements/achievements.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("Ratings already given unlock their steps at startup, announced at once", async () => {
    const { fake, LIST_TEXT, titles, familyToasts, getAllAchievements, newToastTexts, listRows } = await startRatingsScenario({
        active: "Alice",
        ratings: { Alice: { [MEDIEVAL.configId]: 4, [MARS.configId]: 0, [THEATRE.configId]: 2.5, [GONE_TABLES[0]]: 3, [GONE_TABLES[1]]: 5 } },
    });
    const [firstVerdict, armchairCritic, grandInquisitor, oracle] = titles;

    assert.deepEqual(familyToasts(await newToastTexts()), [firstVerdict, armchairCritic]);

    const rows = listRows();
    const rowOf = title => rows.find(row => row.title === title);
    assert.equal(rowOf(firstVerdict).unlocked, true);
    assert.equal(rowOf(armchairCritic).unlocked, true);
    const { short } = LIST_TEXT.progressUnits.ratedTables;
    assert.deepEqual([rowOf(grandInquisitor), rowOf(oracle)].map(({ unlocked, progress }) => ({ unlocked, progress })),
        [{ unlocked: false, progress: short(5, 10) }, { unlocked: false, progress: short(5, 25) }]);

    const rankOf = new Map(getAllAchievements().map(achievement => [achievement.id, achievement.rank]));
    assert.deepEqual(["ratings:1", "ratings:5", "ratings:10", "ratings:25"].map(id => rankOf.get(id)),
        [ACHIEVEMENT_RANK.BRONZE, ACHIEVEMENT_RANK.SILVER, ACHIEVEMENT_RANK.GOLD, ACHIEVEMENT_RANK.PLATINUM]);
    assertNoErrorLogged(fake);
});
