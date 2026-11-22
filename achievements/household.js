// ============================================================
// Household family: Achievements for helping win 1, 5, 15 and 30 Household
// Challenges. Reads the active Profile's credited count from the Household
// Challenge module, also shown as Achievement Progress; writes nothing.
// achievements_engine.js leaves the family out when the Household Challenge
// Add-on is disabled.
// ============================================================

import { ACHIEVEMENT_FAMILY, countedAchievement, PROGRESS_UNIT } from "../common/achievements/achievements.js";
import lang from "../common/core/i18n.js";

// Each value is part of an Achievement ID: changing one would announce the
// Achievement again to players who already earned it. Each one also needs
// its title in every lang/ file.
const HOUSEHOLD_THRESHOLDS = [1, 5, 15, 30];

export function buildHouseholdAchievements(householdChallenge) {
    const { achievements: TEXT } = lang;

    return HOUSEHOLD_THRESHOLDS.map(count => countedAchievement({
        id: `householdCompleted:${count}`,
        family: ACHIEVEMENT_FAMILY.HOUSEHOLD,
        getTitle: () => TEXT.householdCompletedTitles[count],
        getDescription: () => TEXT.householdCompletedDescription(count),
        target: count,
        ladder: HOUSEHOLD_THRESHOLDS,
        unit: PROGRESS_UNIT.CHALLENGES,
        getCurrent: () => householdChallenge.getCreditedCount(),
    }));
}
