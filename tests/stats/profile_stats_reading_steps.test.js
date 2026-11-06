// ============================================================
// The Profile Stats' reading, one section per step of the foreground
// queue (docs/adr/0014), over the fake PinballY host with a drawing ahead
// run one step at a time: the card's step reads only the card's values,
// the GAME section's step its plays, the PROGRESSION section's step the
// Daily Streak, the Challenges and the boards.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createProfileStats } from "../../common/stats/profile_stats.js";
import { createDrawnScreenControls } from "../../common/core/drawn_screen_controls.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

// Each reader records its name in reads when called.
function readers(reads) {
    const record = (name, value) => () => {
        reads.push(name);
        return value;
    };
    return {
        readPlayerLevel: record("playerLevel", { level: 1, points: 0, from: 0, to: 100 }),
        countAchievements: record("achievements", { unlocked: 0, total: 10 }),
        dailyStreak: { read: record("dailyStreak", { current: 0, longest: 0 }) },
        tableOfTheDay: { getStreak: record("dayStreak", 0), getLongestStreak: () => 0 },
        tableOfTheWeek: { getStreak: record("weekStreak", 0), getLongestStreak: () => 0 },
        challenges: { getRecord: record("challenges", { completed: 0, total: 5 }) },
        highScores: { heldBy: record("boards", { highScores: 0, tableRecords: 0 }) },
    };
}

test("the Profile Stats read each section in its own step", () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, notified: [] }));
    const reads = [];
    let foregroundStep = null;
    const drawingAhead = { runInForeground: step => { foregroundStep = step; return () => {}; } };
    const profileStats = createProfileStats(fake, {
        profileStore: createProfileStore(fake), achievementList: { open() {} }, drawingAhead, drawnScreenControls: createDrawnScreenControls(fake), ...readers(reads),
    });

    profileStats.open();
    const readsOfNextStep = () => {
        reads.length = 0;
        foregroundStep();
        return [...reads].sort();
    };

    assert.deepEqual(readsOfNextStep(), ["achievements", "playerLevel"], "the card");
    assert.deepEqual(readsOfNextStep(), [], "the GAME section");
    assert.deepEqual(readsOfNextStep(), ["boards", "challenges", "dailyStreak", "dayStreak", "weekStreak"], "the PROGRESSION section");
});
