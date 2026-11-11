// ============================================================
// Generic Achievement evaluation. An Achievement is a plain object:
//   { id, family, rank, getTitle(), getDescription(), checkUnlocked(), getProgress(), getHint() }
// countedAchievement() and standaloneAchievement() build the common shapes.
// "Unlocked" is computed live; only Notified is persisted ("notified" in profile.json).
// - The rank is never persisted nor part of an ID.
// - getHint() makes it a Secret Achievement.
// - The caller marks an Achievement Notified when its toast starts, or at once for a silent one.
// ============================================================

// The kind of an Achievement; the Challenges, High Scores and Ratings ones
// exist only while their Add-on is enabled, Surprises whenever the Achievements do,
// Young Players only for a Child Profile, Systems only when the Profile's
// tables use two Systems or more.
export const ACHIEVEMENT_FAMILY = Object.freeze({
    COLLECTION: "collection",
    PLAY_TIME: "playTime",
    PERIOD_TABLES: "periodTables",
    SESSIONS: "sessions",
    RANDOM_GAME: "randomGame",
    MANUFACTURERS: "manufacturers",
    SYSTEMS: "systems",
    DECADES: "decades",
    CATEGORIES: "categories",
    CHALLENGES: "challenges",
    HIGH_SCORES: "highScores",
    SURPRISES: "surprises",
    RATINGS: "ratings",
    YOUNG_PLAYERS: "youngPlayers",
});

// What an Achievement Progress counts; each one has its texts in the
// Achievement List's progressUnits of every lang/ file.
export const PROGRESS_UNIT = Object.freeze({
    TABLES: "tables",
    HOURS: "hours",
    DAYS_IN_A_ROW: "daysInARow",
    WEEKS_IN_A_ROW: "weeksInARow",
    DAYS_PLAYED: "daysPlayed",
    WEEKS_PLAYED: "weeksPlayed",
    MINUTES: "minutes",
    RANDOM_GAMES: "randomGames",
    MANUFACTURERS: "manufacturers",
    CHALLENGES: "challenges",
    RATED_TABLES: "ratedTables",
    SYSTEMS: "systems",
});

// Every Achievement's Achievement Rank, from the easiest.
export const ACHIEVEMENT_RANK = Object.freeze({
    BRONZE: "bronze",
    SILVER: "silver",
    GOLD: "gold",
    PLATINUM: "platinum",
});
export const RANKS_IN_ORDER = Object.freeze(Object.values(ACHIEVEMENT_RANK));

// A group completion's rank from the size of its group: up to each limit,
// that rank; above the last one, Platinum.
const GROUP_COMPLETION_RANK_LIMITS = [
    { maxTables: 3, rank: ACHIEVEMENT_RANK.BRONZE },
    { maxTables: 10, rank: ACHIEVEMENT_RANK.SILVER },
    { maxTables: 25, rank: ACHIEVEMENT_RANK.GOLD },
];

// A ladder is a series of Achievements that only differ by their threshold:
// its first step is always Bronze, its last always Platinum, the others
// spread in between. A single step is no ladder: it is Gold, like a
// standalone Achievement.
function ladderRank(ladder, step) {
    const position = ladder.indexOf(step);
    if (position === -1) throw new Error(`"${step}" is not a step of its ladder`);
    if (ladder.length === 1) return ACHIEVEMENT_RANK.GOLD;
    return RANKS_IN_ORDER[Math.round(position * (RANKS_IN_ORDER.length - 1) / (ladder.length - 1))];
}

function groupCompletionRank(tableCount) {
    const limit = GROUP_COMPLETION_RANK_LIMITS.find(({ maxTables }) => tableCount <= maxTables);
    return limit ? limit.rank : ACHIEVEMENT_RANK.PLATINUM;
}

// An Achievement outside any ladder or group, such as rage quit. Its
// structure says nothing about how hard it is, hence Gold unless stated.
// Only such an Achievement can be secret, with getHint: a ladder's step or
// a group completion is a goal to aim at. isSilent: Notified with no toast.
export function standaloneAchievement({ id, family, rank = ACHIEVEMENT_RANK.GOLD, getTitle, getDescription, checkUnlocked, getHint, isSilent = false }) {
    return { id, family, rank, getTitle, getDescription, checkUnlocked, isSilent, ...(getHint ? { getHint } : {}) };
}

// Below this target, an Achievement Progress would only ever read "0/1".
const MIN_PROGRESS_TARGET = 2;

// An Achievement unlocked once getCurrent() reaches target, with that same
// value as its Achievement Progress: the two can never disagree. With
// getRecord (the best value ever reached, never below getCurrent()), the
// record unlocks it instead, so it stays Unlocked when the value drops
// again, while a missing one still shows the value.
// Its rank comes from exactly one of: its ladder, the thresholds of its
// series in order, and its step in it (its target unless the ladder counts
// something else, such as percentages); for a group completion, the size of
// the group, which is its target; or a stated rank, for a standalone one.
export function countedAchievement({
    id, family, getTitle, getDescription, target, unit, getCurrent, getRecord = getCurrent,
    ladder, step = target, isGroupCompletion = false, rank,
}) {
    const hasLadder = ladder !== undefined;
    const rankSources = [hasLadder, isGroupCompletion, rank !== undefined].filter(Boolean).length;
    if (rankSources !== 1) throw new Error(`${id} needs exactly one of a ladder, a group completion or a stated rank`);
    return {
        id,
        family,
        rank: rank ?? (hasLadder ? ladderRank(ladder, step) : groupCompletionRank(target)),
        getTitle,
        getDescription,
        checkUnlocked: () => getRecord() >= target,
        getProgress: () => (target >= MIN_PROGRESS_TARGET ? { current: getCurrent(), target, unit } : null),
    };
}

// Records in the named Profile, which may no longer be the active one, that
// it was Notified of the achievement.
export function markNotified(profileStore, profileName, id) {
    profileStore.updateProfileData(data => {
        if (!data.notified.includes(id)) data.notified.push(id);
    }, profileName);
}

// Calls onNewlyUnlocked(achievement) for each achievement the active
// Profile unlocked and was not yet Notified of.
export function evaluateAchievements(achievements, profileStore, onNewlyUnlocked) {
    const notified = new Set(profileStore.getProfileData().notified);
    for (const achievement of achievements) {
        if (achievement.checkUnlocked() && !notified.has(achievement.id)) {
            onNewlyUnlocked(achievement);
        }
    }
}