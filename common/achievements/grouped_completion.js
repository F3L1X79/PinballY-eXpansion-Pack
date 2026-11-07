// ============================================================
// Generic "played every table of this group" Achievement builder, used by
// the category and decade Achievements, with an Achievement Rank from the
// group's size. No side effects.
// - A game in several groups counts toward each.
// - Groups hold only the tables the Profile can see: a group of fewer than minTables gives no Achievement.
// ============================================================

import { getActiveProfileTables } from "../tables/visible_tables.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { countedAchievement, PROGRESS_UNIT } from "./achievements.js";

export function buildGroupedCompletionAchievements({ getGroupKeys, idPrefix, family, getTitle, getDescription, minTables = 1, asNonChild = false, profileName }) {
    const allGames = getActiveProfileTables({ asNonChild, profileName });
    const groups = new Map();

    for (const game of allGames) {
        for (const key of getGroupKeys(game)) {
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(game);
        }
    }

    // Decade keys ("1980s") sort chronologically as text too.
    const sortedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));

    const achievements = [];
    for (const key of sortedKeys) {
        const games = groups.get(key);
        if (games.length < minTables) continue;
        achievements.push(countedAchievement({
            id: `${idPrefix}:${key}`,
            family,
            getTitle: () => getTitle(key),
            getDescription: () => getDescription(key, games.length),
            target: games.length,
            isGroupCompletion: true,
            unit: PROGRESS_UNIT.TABLES,
            getCurrent: () => games.filter(game => getProfileStore().hasPlayed(game.configId)).length,
        }));
    }
    return achievements;
}