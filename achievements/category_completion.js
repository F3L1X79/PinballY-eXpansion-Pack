// ============================================================
// Builds one achievement per table category (PinballY's game.categories):
// unlocked once the active Profile has played every table it can see in that
// category at least once, for a category of at least two such tables. Sorted by category. asNonChild builds them as a Profile that is not
// a child would see them (for the Player Level's scaling).
// Called by achievements_engine.js at each check; no side effects.
// ============================================================

import { buildGroupedCompletionAchievements } from "../common/achievements/grouped_completion.js";
import { ACHIEVEMENT_FAMILY } from "../common/achievements/achievements.js";
import lang from "../common/core/i18n.js";

export function buildCategoryCompletionAchievements({ asNonChild = false, profileName } = {}) {
    const { achievements: TEXT } = lang;
    return buildGroupedCompletionAchievements({
        getGroupKeys: (game) => Array.isArray(game.categories) ? game.categories : [],
        asNonChild,
        profileName,
        // A one-table category, often a tag set once, would be as easy as one Play.
        minTables: 2,
        idPrefix: "categoryCompletion",
        family: ACHIEVEMENT_FAMILY.CATEGORIES,
        getTitle: (category) => TEXT.categoryCompletionTitle(category),
        getDescription: (category, count) => TEXT.categoryCompletionDescription(category, count),
    });
}