// ============================================================
// One Achievement per System among the tables the active Profile can see:
// unlocked once it has played every one of them, with an Achievement Rank
// from the System's table count. Called by achievements_engine.js at each
// check; no side effects.
// - A System is PinballY's display name, never its systemClass (spec #509).
// - With fewer than two Systems, the family builds nothing at all.
// - asNonChild builds them as a non-child Profile would see them (Player Level scaling).
// ============================================================

import { buildGroupedCompletionAchievements } from "../common/achievements/grouped_completion.js";
import { ACHIEVEMENT_FAMILY } from "../common/achievements/achievements.js";
import lang from "../common/core/i18n.js";

export function buildSystemCompletionAchievements({ asNonChild = false, profileName } = {}) {
    const { achievements: TEXT } = lang;
    // One Achievement per System: every group of one table or more gives one.
    const achievements = buildGroupedCompletionAchievements({
        getGroupKeys: (game) => (game.system && game.system.displayName ? [game.system.displayName] : []),
        asNonChild,
        profileName,
        idPrefix: "systemCompletion",
        family: ACHIEVEMENT_FAMILY.SYSTEMS,
        getTitle: (system) => TEXT.systemCompletionTitle(system),
        getDescription: (system, count) => TEXT.systemCompletionDescription(system, count),
    });
    return achievements.length < 2 ? [] : achievements;
}
