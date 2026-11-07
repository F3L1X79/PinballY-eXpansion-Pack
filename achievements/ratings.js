// ============================================================
// Ratings family: Achievements for rating 1, 5, 10 and 25 tables. Reads the
// active Profile's rated table count from common/profiles/profile_ratings.js,
// also shown as Achievement Progress; writes nothing. None while the Ratings
// per Profile Add-on is off: the Ratings then belong to no Profile.
// - Every Rating counts, tables gone from the game list and Adult Tables included.
// ============================================================

import { ACHIEVEMENT_FAMILY, countedAchievement, PROGRESS_UNIT } from "../common/achievements/achievements.js";
import lang from "../common/core/i18n.js";
import { getProfileRatings } from "../common/profiles/profile_ratings.js";
import config from "../common/core/config.js";

// Each value is part of an Achievement ID: changing one would announce the
// Achievement again to players who already earned it. Each one also needs
// its title in every lang/ file.
const RATED_TABLE_THRESHOLDS = [1, 5, 10, 25];

export function buildRatingsAchievements() {
    if (config.addOns.profileRatings === false) return [];

    const { achievements: TEXT } = lang;
    // Counted once per set: each step and its Achievement Progress read it,
    // and the count reads the whole game list.
    let ratedTables = null;
    function countRatedTables() {
        if (ratedTables === null) ratedTables = getProfileRatings().countRatedTables();
        return ratedTables;
    }

    return RATED_TABLE_THRESHOLDS.map(count => countedAchievement({
        id: `ratings:${count}`,
        family: ACHIEVEMENT_FAMILY.RATINGS,
        getTitle: () => TEXT.ratingsTitles[count],
        getDescription: () => TEXT.ratingsDescription(count),
        target: count,
        ladder: RATED_TABLE_THRESHOLDS,
        unit: PROGRESS_UNIT.RATED_TABLES,
        getCurrent: countRatedTables,
    }));
}
