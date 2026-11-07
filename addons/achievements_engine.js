// ============================================================
// Checks the active Profile's Achievements on each event that can unlock one
// (startup, a game, a Profile switch, the rating dialog closing...) and hands
// the new ones to the Achievement Toast module, then one Level Toast when the
// Player Level rises. Also adds Achievement List and Profile Stats to the
// main menu, and starts the World Tour and Surprises trackers.
// - An Achievement becomes Notified when its toast starts, not when it unlocks.
// - The level at startup, at a switch or after a Profile Reset is a baseline, never announced.
// - A Child Profile's level scales its points by the set a non-child Profile would have.
// - The Challenges / High Scores / Ratings families exist only while their Add-on is on.
// ============================================================

import { evaluateAchievements, markNotified, ACHIEVEMENT_RANK } from "../common/achievements/achievements.js";
import { buildDayManufacturersAchievements } from "../achievements/day_manufacturers.js";
import { buildManufacturerCompletionAchievements } from "../achievements/manufacturer_completion.js";
import { buildCollectionCompletionAchievements } from "../achievements/collection_completion.js";
import { buildPlayTimeTotalAchievements } from "../achievements/play_time_totals.js";
import { buildPeriodTableAchievements } from "../achievements/period_tables.js";
import { buildDecadeCompletionAchievements } from "../achievements/decade_completion.js";
import { buildCategoryCompletionAchievements } from "../achievements/category_completion.js";
import { buildSessionMilestoneAchievements } from "../achievements/session_milestones.js";
import { buildRandomGameFanAchievements } from "../achievements/random_game_fans.js";
import { buildChallengeAchievements } from "../achievements/challenges.js";
import { buildHighScoreAchievements } from "../achievements/high_scores.js";
import { getHighScoreStore } from "../common/high_scores/high_score_store.js";
import { buildWorldTourAchievements } from "../achievements/world_tour.js";
import { createWorldTour } from "../common/achievements/world_tour.js";
import { buildSurprisesAchievements } from "../achievements/surprises.js";
import { createSurprises } from "../common/achievements/surprises.js";
import { buildRatingsAchievements } from "../achievements/ratings.js";
import { RATE_GAME_POPUP } from "../common/profiles/profile_ratings.js";
import { buildYoungPlayersAchievements } from "../achievements/young_players.js";
import { getAchievementToasts, TOAST_KIND } from "../common/achievements/achievement_toast.js";
import { getPlayerLevel, playerLevelOf } from "../common/levels/player_level.js";
import { getShownPlayerLevel } from "../common/levels/shown_player_level.js";
import { getMainMenu, MAIN_MENU_POSITION } from "../common/menus/main_menu.js";
import { createAchievementList } from "../common/achievements/achievement_list.js";
import { createProfileStats } from "../common/stats/profile_stats.js";
import { createAvatarFrameList } from "../common/avatar_frames/avatar_frame_list.js";
import { createHouseholdStats } from "../common/stats/household_stats.js";
import { getWheelDialogs } from "../common/core/wheel_dialog.js";
import { getProfileRewards } from "../common/avatar_frames/profile_rewards.js";
import { getDailyStreak } from "../common/achievements/daily_streak.js";
import { HALL_OF_FAME_FULL_FILTER_ID } from "../common/stats/hall_of_fame.js";
import { TABLES_TO_DISCOVER_FULL_FILTER_ID } from "../common/tables/tables_to_discover.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { getDrawnScreenControls } from "../common/core/drawn_screen_controls.js";
import { getTableOfTheDay, getTableOfTheWeek } from "../common/tables/period_table.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getChallenges } from "../common/challenges/challenge.js";
import config from "../common/core/config.js";
import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";

const SCRIPT_NAME = "AchievementsEngine";
const ACHIEVEMENT_LIST_ENTRY = "achievementList";
const PROFILE_STATS_ENTRY = "profileStats";

// Null when the Challenges Add-on is disabled: then neither the Challenges
// family nor the Profile Stats line exists.
const getEnabledChallenges = () => (config.addOns.challenges === false ? null : getChallenges());

// Null when the High Scores Add-on is disabled: then neither the High Scores
// family nor the stats lines exist.
const getEnabledHighScores = () => (config.addOns.highScores === false ? null : getHighScoreStore());

// Empty when the session stats tracker Add-on is disabled: the Sessions
// family follows the Add-on that records what most of it reads.
const getEnabledSessionMilestones = () => (config.addOns.sessionStatsTracker === false ? [] : buildSessionMilestoneAchievements());

// Exported for the tests, which read each Achievement's rank. asNonChild:
// the set as a Profile that is not a child would see it with the same
// collection; profileName: as that Profile would see it (the active one by
// default). Either is only ever counted (never evaluated, toasted nor
// Notified).
export function getAllAchievements({ asNonChild = false, profileName } = {}) {
    const challenges = getEnabledChallenges();
    const highScores = getEnabledHighScores();
    const seenBy = { asNonChild, profileName };
    return [
        ...buildDayManufacturersAchievements(),
        ...buildManufacturerCompletionAchievements(seenBy),
        ...buildCollectionCompletionAchievements(seenBy),
        ...buildWorldTourAchievements(),
        ...buildPlayTimeTotalAchievements(),
        ...buildPeriodTableAchievements(),
        ...buildDecadeCompletionAchievements(seenBy),
        ...buildCategoryCompletionAchievements(seenBy),
        ...getEnabledSessionMilestones(),
        ...buildRandomGameFanAchievements(),
        ...(challenges ? buildChallengeAchievements(challenges) : []),
        ...(highScores ? buildHighScoreAchievements(highScores, seenBy) : []),
        ...buildSurprisesAchievements(seenBy),
        ...buildRatingsAchievements(),
        ...buildYoungPlayersAchievements({ ...seenBy, highScores }),
    ];
}

// Inside withAchievementSets: each set built so far, by the lower-case
// Profile name (null key: the non-child set); null outside, every read then
// building its own.
let builtSets = null;

// Runs run() with each Achievement set built once, whichever readers ask
// for it: on the cabinet a set costs about 100 ms, and both the Player Level
// and the Achievements count need it (a child's level the non-child set
// too). Never kept past run(), so an Unlock or a hidden table shows on the
// next read.
function withAchievementSets(run) {
    if (builtSets) return run();
    builtSets = new Map();
    try {
        return run();
    } finally {
        builtSets = null;
    }
}

// seenBy: getAllAchievements()'s, a named Profile unless asNonChild.
function achievementSetOf(seenBy) {
    const key = seenBy.asNonChild ? null : seenBy.profileName.toLowerCase();
    if (builtSets && builtSets.has(key)) return builtSets.get(key);
    const achievements = getAllAchievements(seenBy);
    if (builtSets) builtSets.set(key, achievements);
    return achievements;
}

// What a Child Profile's points are scaled by: the set a Profile that is
// not a child would have, only built for a child (the named Profile, the
// active one by default); null otherwise.
const nonChildAchievementsFor = (profileStore, profileName) =>
    (profileStore.isChild(profileName) ? achievementSetOf({ asNonChild: true }) : null);

// The named Profile's Player Level, from its Notified Achievements over the
// set it would see, a Child Profile's points scaled up: the same for every
// screen, whichever Profile is active.
function readPlayerLevelOf(profileStore, profileName) {
    return getPlayerLevel(profileStore.getNotifiedOf(profileName), achievementSetOf({ profileName }),
        nonChildAchievementsFor(profileStore, profileName));
}

// The Profile Stats, once init() created them.
let sharedProfileStats = null;

// Exported for the tests: the values the Profile Stats show for the named
// Profile (the active one by default).
export const readProfileStats = profileName => sharedProfileStats.readStats(profileName);

export default function init() {
    const achievementToasts = getAchievementToasts();
    const profileStore = getProfileStore();
    const shownPlayerLevel = getShownPlayerLevel();
    // Another Profile's level, as its Profile Stats show it.
    shownPlayerLevel.setUnshownReader(profileName => readPlayerLevelOf(profileStore, profileName).level);

    const profileRewards = getProfileRewards();
    const achievementList = createAchievementList(createPinballYHost(), {
        getAchievements: getAllAchievements, profileStore, drawingAhead: getDrawingAhead(), drawnScreenControls: getDrawnScreenControls(), profileRewards,
    });
    const mainMenu = getMainMenu();
    mainMenu.add({
        name: ACHIEVEMENT_LIST_ENTRY,
        label: lang.achievementList.menuEntry,
        position: MAIN_MENU_POSITION.ACHIEVEMENT_LIST,
        // Exit goes back one level: the main menu, on this entry.
        action: () => achievementList.open(() => mainMenu.reopenOn(ACHIEVEMENT_LIST_ENTRY)),
    });
    const frameList = createAvatarFrameList(createPinballYHost(), {
        profileStore, profileRewards, drawingAhead: getDrawingAhead(), drawnScreenControls: getDrawnScreenControls(),
    });
    // Its values read through the Profile Stats' reader, and its columns
    // opening the Profile Stats, created just after.
    const householdStats = createHouseholdStats(createPinballYHost(), {
        profileStore,
        readStats: (profileName, timeReader) => profileStats.readStats(profileName, timeReader),
        openProfileStats: (profileName, onBack, onFailed) => profileStats.openReadOnly(profileName, onBack, onFailed),
        profileRewards,
        drawingAhead: getDrawingAhead(),
        drawnScreenControls: getDrawnScreenControls(),
        hasCollectionMastery: config.addOns.tableMastery !== false,
        highScores: getEnabledHighScores(),
    });
    const profileStats = createProfileStats(createPinballYHost(), {
        profileStore,
        householdStats,
        achievementList,
        drawingAhead: getDrawingAhead(),
        drawnScreenControls: getDrawnScreenControls(),
        profileRewards,
        frameList,
        // Read on each opening, for the active Profile or another one.
        readPlayerLevel: profileName => readPlayerLevelOf(profileStore, profileName),
        withAchievementSets,
        // The active Profile's live count, as its Achievement List shows it;
        // another Profile's Notified Achievements, the only Unlocks known
        // without it active, out of the set it would see.
        countAchievements(profileName) {
            if (profileName.toLowerCase() === profileStore.getActiveProfile().name.toLowerCase()) return achievementList.countAll();
            const ids = new Set(achievementSetOf({ profileName }).map(achievement => achievement.id));
            return { unlocked: profileStore.getNotifiedOf(profileName).filter(id => ids.has(id)).length, total: ids.size };
        },
        dailyStreak: getDailyStreak(),
        tableOfTheDay: getTableOfTheDay(),
        tableOfTheWeek: getTableOfTheWeek(),
        challenges: getEnabledChallenges(),
        highScores: getEnabledHighScores(),
        // Without its Add-on, a selection has no filter, so no button.
        hallOfFameFilter: config.addOns.hallOfFame === false ? null : HALL_OF_FAME_FULL_FILTER_ID,
        tablesToDiscoverFilter: config.addOns.tablesToDiscover === false ? null : TABLES_TO_DISCOVER_FULL_FILTER_ID,
    });
    sharedProfileStats = profileStats;
    // Drawn over the wheel without leaving its UI mode: a waiting dialog
    // (such as the rating prompt after "Go equip it") shows only once the
    // player is back on the wheel.
    for (const screen of [achievementList, frameList, profileStats, householdStats]) getWheelDialogs().waitFor(screen);
    // "Go equip it" needs the Profile Stats' frame list, so the Reward
    // Prompt exists only with them.
    profileRewards.enablePrompts(profileStats.openFrameList, achievementToasts);
    mainMenu.add({
        name: PROFILE_STATS_ENTRY,
        label: lang.profileStats.menuEntry,
        position: MAIN_MENU_POSITION.PROFILE_STATS,
        // Exit goes back one level: the main menu, on this entry.
        action: () => profileStats.open(() => mainMenu.reopenOn(PROFILE_STATS_ENTRY)),
    });
    // Achievements handed to the Achievement Toast module, by Profile name
    // in lower case (Profile names ignore case). They are not Notified until
    // their toast starts, so later checks find the waiting ones again.
    const submittedIdsByProfile = new Map();
    // Profile Resets so far, by Profile name in lower case: a toast submitted
    // before its Profile's reset is stale.
    const resetCountByProfile = new Map();
    const resetCountOf = profileKey => resetCountByProfile.get(profileKey) || 0;

    // The level once every toast submitted so far has started.
    function levelOnceShown(submittedIds, achievements, nonChildAchievements) {
        const ids = [...profileStore.getProfileData().notified, ...submittedIds];
        return getPlayerLevel(ids, achievements, nonChildAchievements).level;
    }

    function submitLevelToast(profileKey, level, resetCount) {
        const TEXT = lang.playerLevel;
        achievementToasts.submit({
            kind: TOAST_KIND.LEVEL,
            tileNumber: level,
            title: TEXT.toastTitle(level),
            description: TEXT.toastDescription,
            onShown: () => shownPlayerLevel.set(profileKey, level),
            isStale: () => resetCountOf(profileKey) !== resetCount,
        });
    }

    // isBaseline: the check at startup or at a Profile switch, whose level,
    // toasts included, is never announced.
    function checkForNewAchievements({ isBaseline = false } = {}) {
        // A toast may start after a switch: it is credited to the Profile
        // active when it was unlocked.
        const profileName = profileStore.getActiveProfile().name;
        const profileKey = profileName.toLowerCase();
        if (!submittedIdsByProfile.has(profileKey)) submittedIdsByProfile.set(profileKey, new Set());
        const submittedIds = submittedIdsByProfile.get(profileKey);
        const resetCount = resetCountOf(profileKey);
        const achievements = getAllAchievements();
        const nonChildAchievements = nonChildAchievementsFor(profileStore);
        // Read with the collection as it is now: a drop (a gone Achievement,
        // a lowered Rank) lets a level won back by this check be announced
        // again, and a rise from the collection alone (Adult Tables added,
        // which scales a child's points up) is never announced.
        const levelBefore = levelOnceShown(submittedIds, achievements, nonChildAchievements);
        evaluateAchievements(achievements, profileStore, (achievement) => {
            if (submittedIds.has(achievement.id)) return;
            submittedIds.add(achievement.id);
            achievementToasts.submit({
                title: achievement.getTitle(),
                description: achievement.getDescription(),
                rank: achievement.rank,
                celebrate: achievement.rank === ACHIEVEMENT_RANK.PLATINUM,
                onShown: () => markNotified(profileStore, profileName, achievement.id),
                isStale: () => resetCountOf(profileKey) !== resetCount,
            });
        });
        const levelAfter = levelOnceShown(submittedIds, achievements, nonChildAchievements);
        if (isBaseline) shownPlayerLevel.set(profileName, levelAfter);
        else if (levelAfter > levelBefore) submitLevelToast(profileKey, levelAfter, resetCount);
    }

    // The timer callback runs outside the event handler's call stack, so it
    // needs its own guard.
    const safeCheckForNewAchievements = safeHandler(SCRIPT_NAME, () => checkForNewAchievements());
    const safeCheckBaseline = safeHandler(SCRIPT_NAME, () => checkForNewAchievements({ isBaseline: true }));

    // Fire on table launch and exit (the launch check catches the "grand
    // return" flag set at launch). Deferred by one tick so the stats trackers'
    // handlers for the same event run first.
    mainWindow.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        setTimeout(safeCheckForNewAchievements, 0);
    }));

    mainWindow.on("gameover", safeHandler(SCRIPT_NAME, () => {
        setTimeout(safeCheckForNewAchievements, 0);
    }));

    // Fires after any change of a Profile's data: a reset Profile starts
    // over, so its Achievements are announced again once unlocked again,
    // and its toasts still waiting never show.
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, (profileName, { isReset }) => {
        if (!isReset) return;
        const profileKey = profileName.toLowerCase();
        submittedIdsByProfile.delete(profileKey);
        resetCountByProfile.set(profileKey, resetCountOf(profileKey) + 1);
        shownPlayerLevel.set(profileName, playerLevelOf(0).level);
    }));

    // Fires on every Profile switch: announces what the new Profile has
    // unlocked but was never announced (for example after an update); its
    // level, those toasts included, is the baseline.
    profileStore.onSwitch(safeCheckBaseline);

    // Checked right after the flag is set, so the World Tour's toast shows
    // on the wheel the moment the last table is selected.
    createWorldTour(createPinballYHost(), profileStore, { onCompleted: () => checkForNewAchievements() });
    // Its Play listener runs inside the "gameover" handlers, so the deferred
    // check above reads what it recorded.
    createSurprises(createPinballYHost(), profileStore);
    // Fires a little after the game, once the board read again credited
    // High Scores. A tick later, so the High Score Toast, submitted after
    // the store's answer, shows before the Achievements it brought.
    const highScores = getEnabledHighScores();
    if (highScores) highScores.onCredited(safeHandler(SCRIPT_NAME, () => setTimeout(safeCheckForNewAchievements, 0)));
    // Fires when PinballY's rating dialog closes (Rate Table or the Rating
    // Prompt): PinballY raises no event when a Rating changes, and its
    // column already holds the new one (ADR 0024), so no tick is waited:
    // no other handler of this event records anything the check reads.
    if (config.addOns.profileRatings !== false) {
        mainWindow.on("popupclose", safeHandler(SCRIPT_NAME, ev => {
            if (ev.id === RATE_GAME_POPUP) checkForNewAchievements();
        }));
    }

    // Startup check, one tick after the inits, so a Welcome Screen submitted
    // at startup is already waiting whatever the order in main.js, and its
    // toasts wait for it.
    setTimeout(safeCheckBaseline, 0);
}
