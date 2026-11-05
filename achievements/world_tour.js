// ============================================================
// The World Tour Secret Achievement: every table of the "All Tables" wheel
// that the Profile can see selected in one go, without launching any. Unlocked
// by the Profile's worldTour flag, set by common/achievements/world_tour.js.
// Called by achievements_engine.js at each check; no side effects.
// ============================================================

import { ACHIEVEMENT_FAMILY, ACHIEVEMENT_RANK, standaloneAchievement } from "../common/achievements/achievements.js";
import lang from "../common/core/i18n.js";
import { getProfileStore } from "../common/profiles/profile_store.js";

export function buildWorldTourAchievements() {
    const { achievements: TEXT } = lang;

    return [standaloneAchievement({
        id: "worldTour",
        family: ACHIEVEMENT_FAMILY.COLLECTION,
        // Long and tedious, but no skill needed.
        rank: ACHIEVEMENT_RANK.SILVER,
        getTitle: () => TEXT.worldTourTitle(),
        getDescription: () => TEXT.worldTourDescription(),
        getHint: () => TEXT.worldTourHint(),
        checkUnlocked: () => getProfileStore().getProfileData().worldTour === true,
    })];
}
