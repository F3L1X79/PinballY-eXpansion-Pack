// ============================================================
// Systems family, among the tables the active Profile can see: one
// Achievement per System, unlocked once it has played every one of them,
// ranked by the System's table count, then World Walker (everySystem), one
// table played on each System. Called by achievements_engine.js at each check.
// - A System is PinballY's display name, never its systemClass (spec #509).
// - With fewer than two Systems, the family builds nothing at all.
// - asNonChild builds them as a non-child Profile would see them (Player Level scaling).
// ============================================================

import { buildGroupedCompletionAchievements } from "../common/achievements/grouped_completion.js";
import { ACHIEVEMENT_FAMILY, ACHIEVEMENT_RANK, countedAchievement, PROGRESS_UNIT } from "../common/achievements/achievements.js";
import lang from "../common/core/i18n.js";
import { getActiveProfileTables } from "../common/tables/visible_tables.js";
import { getProfileStore } from "../common/profiles/profile_store.js";

const systemsOf = (game) => (game.system && game.system.displayName ? [game.system.displayName] : []);

export function buildSystemCompletionAchievements({ asNonChild = false, profileName } = {}) {
    const { achievements: TEXT } = lang;
    // One Achievement per System: every group of one table or more gives one.
    const completions = buildGroupedCompletionAchievements({
        getGroupKeys: systemsOf,
        asNonChild,
        profileName,
        idPrefix: "systemCompletion",
        family: ACHIEVEMENT_FAMILY.SYSTEMS,
        getTitle: (system) => TEXT.systemCompletionTitle(system),
        getDescription: (system, count) => TEXT.systemCompletionDescription(system, count),
    });
    if (completions.length < 2) return [];
    return [...completions, buildEverySystemAchievement(getActiveProfileTables({ asNonChild, profileName }))];
}

function buildEverySystemAchievement(tables) {
    const { achievements: TEXT } = lang;
    const systemCount = new Set(tables.flatMap(systemsOf)).size;
    const countPlayedSystems = () => new Set(tables
        .filter(game => getProfileStore().hasPlayed(game.configId))
        .flatMap(systemsOf)).size;

    return countedAchievement({
        id: "everySystem",
        family: ACHIEVEMENT_FAMILY.SYSTEMS,
        // One table on each System: an easy goal, whatever the System count.
        rank: ACHIEVEMENT_RANK.BRONZE,
        getTitle: () => TEXT.everySystemTitle(),
        getDescription: () => TEXT.everySystemDescription(systemCount),
        target: systemCount,
        unit: PROGRESS_UNIT.SYSTEMS,
        getCurrent: countPlayedSystems,
    });
}
