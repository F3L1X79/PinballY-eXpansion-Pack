// ============================================================
// Period Table: picks a table once per Period (day or week), launches it,
// and keeps each Profile's Streak and Periods Played. Shared through
// getTableOfTheDay() and getTableOfTheWeek().
// - The table is the household's, locked in cabinet.json.
// - A Period counts only through a Play of its table, however it was launched.
// - An Adult Table is not offered to a Child Profile, whose Streak goes on across it.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost, isVisibleTable } from "../core/pinbally_host.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { isAdultTable, isKeptFromChild } from "./adult_tables.js";
import { launchShownTable } from "./table_launch.js";

const SCRIPT_NAME = "PeriodTable";

// Also the Challenges' day key: saved in profile.json, it must never change.
export function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey, days) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return formatDateKey(new Date(year, month - 1, day + days));
}

// A week runs Monday to Sunday and is keyed by its Monday's date; the
// Challenges share it.
export function getWeekKey(date) {
    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    return formatDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday));
}

function pickPurelyRandom(tables) {
    return tables[Math.floor(Math.random() * tables.length)];
}

function pickNeverPlayedOrOldest(tables) {
    const neverPlayed = tables.filter(game => !game.lastPlayed);
    if (neverPlayed.length > 0) {
        return pickPurelyRandom(neverPlayed);
    }

    return tables.reduce((oldest, game) =>
        game.lastPlayed < oldest.lastPlayed ? game : oldest
    );
}

// The name keys the lock in cabinet.json and the Streak in profile.json:
// it is players' saved progress and must never change.
export const TABLE_OF_THE_DAY = {
    name: "tableOfTheDay",
    getPeriodKey: formatDateKey,
    getPreviousPeriodKey: dayKey => shiftDateKey(dayKey, -1),
    pickTable: pickNeverPlayedOrOldest,
};

export const TABLE_OF_THE_WEEK = {
    name: "tableOfTheWeek",
    getPeriodKey: getWeekKey,
    getPreviousPeriodKey: weekKey => shiftDateKey(weekKey, -7),
    pickTable: pickPurelyRandom,
};

const NO_LOCK = Object.freeze({ configId: "", period: "", adultPeriods: [] });
// A Child Profile's Streak only skips the adult Periods since its last
// play: two months of days, or more than a year of weeks, is more than
// any realistic gap.
const MAX_ADULT_PERIODS = 60;
const NO_STREAK = Object.freeze({ current: 0, longest: 0, lastPeriod: "", periodsPlayed: 0 });

export function createPeriodTable(host, definition, profileStore) {
    const { name, getPeriodKey, getPreviousPeriodKey, pickTable } = definition;

    // A record missing a field (hand-edited file) gets it empty, never NaN.
    const getLock = () => {
        const lock = { ...NO_LOCK, ...profileStore.getCabinetData()[name] };
        return Array.isArray(lock.adultPeriods) ? lock : { ...lock, adultPeriods: [] };
    };
    const streakRecordOf = data => ({ ...NO_STREAK, ...data.streaks[name] });
    // The named Profile's (the active one by default).
    const getStreakRecord = profileName =>
        streakRecordOf(profileName === undefined ? profileStore.getProfileData() : profileStore.getProfileDataOf(profileName));

    // Also keeps the Period among the adult Periods exactly while its table
    // is an Adult Table, which follows a table tagged or untagged mid-Period.
    function getTable() {
        const currentPeriod = getPeriodKey(host.now());
        const game = getLockedTable(currentPeriod) || pickNewTable(currentPeriod);
        markAdultPeriod(currentPeriod, game !== null && isAdultTable(game));
        return game;
    }

    function getLockedTable(currentPeriod) {
        const { period: lockedPeriod, configId: lockedConfigId } = getLock();
        if (lockedPeriod !== currentPeriod || !lockedConfigId) return null;
        const lockedGame = host.getGameInfo(lockedConfigId);
        return lockedGame && isVisibleTable(lockedGame) ? lockedGame : null;
    }

    function pickNewTable(currentPeriod) {
        const { period: lockedPeriod, configId: lockedConfigId, adultPeriods } = getLock();

        // A new Period never repeats the previous Period's table, unless it
        // is the only visible one. The pick reads PinballY's own play stats,
        // the household's history, whoever is active.
        const excludeConfigId = lockedPeriod !== currentPeriod ? lockedConfigId : "";
        const visibleTables = host.getVisibleTables();
        if (visibleTables.length === 0) return null;
        const otherTables = visibleTables.filter(game => game.configId !== excludeConfigId);
        const newPick = pickTable(otherTables.length > 0 ? otherTables : visibleTables);

        profileStore.updateCabinetData(cabinet => {
            cabinet[name] = withAdultPeriods({ configId: newPick.configId, period: currentPeriod }, adultPeriods);
        });
        return newPick;
    }

    // The key is left out of the lock until there is a Period to keep.
    const withAdultPeriods = (lock, adultPeriods) => (adultPeriods.length > 0 ? { ...lock, adultPeriods } : lock);

    function markAdultPeriod(period, isAdult) {
        const { adultPeriods } = getLock();
        if (adultPeriods.includes(period) === isAdult) return;
        const updated = isAdult
            ? [...adultPeriods, period].slice(-MAX_ADULT_PERIODS)
            : adultPeriods.filter(adultPeriod => adultPeriod !== period);
        profileStore.updateCabinetData(cabinet => {
            const { adultPeriods: _, ...lock } = cabinet[name];
            cabinet[name] = withAdultPeriods(lock, updated);
        });
    }

    // Not offered to a Child Profile while it is an Adult Table. Like
    // getTable(), it may pick this Period's table and lock it.
    const isKeptFromChildProfile = game => game !== null && isKeptFromChild(game, profileStore);
    const isOffered = () => !isKeptFromChildProfile(getTable());
    // This Period's table, or null when it is not offered to the active Profile.
    function getOfferedTable() {
        const game = getTable();
        return isKeptFromChildProfile(game) ? null : game;
    }

    // Whether currentPeriod follows lastPeriod in the Streak of the named
    // Profile (the active one by default): for a Child Profile, the adult
    // Periods between them are skipped, not missed.
    function followsInStreak(lastPeriod, currentPeriod, profileName) {
        const skipped = profileStore.isChild(profileName) ? getLock().adultPeriods : [];
        let period = getPreviousPeriodKey(currentPeriod);
        while (period !== lastPeriod && skipped.includes(period)) period = getPreviousPeriodKey(period);
        return period === lastPeriod;
    }

    function launch() {
        const game = getTable();
        if (game) launchShownTable(host, game);
    }

    // Whether the active Profile already played this Period's table.
    const isPlayedThisPeriod = () => getStreakRecord().lastPeriod === getPeriodKey(host.now());
    const getLongestStreak = profileName => getStreakRecord(profileName).longest;
    const getPeriodsPlayed = () => getStreakRecord().periodsPlayed;

    function recordPeriodPlayed(playedPeriod, profileName) {
        profileStore.updateProfileData(data => {
            const { current, longest, lastPeriod, periodsPlayed } = streakRecordOf(data);
            if (lastPeriod === playedPeriod) return;
            const newStreak = followsInStreak(lastPeriod, playedPeriod, profileName) ? current + 1 : 1;
            data.streaks[name] = {
                current: newStreak,
                longest: Math.max(longest, newStreak),
                lastPeriod: playedPeriod,
                periodsPlayed: periodsPlayed + 1,
            };
        }, profileName);
    }

    // The named Profile's (the active one by default).
    function getStreak(profileName) {
        const currentPeriod = getPeriodKey(host.now());
        const { current, lastPeriod } = getStreakRecord(profileName);

        // The stored counter is only reset on the next play, so a Streak whose
        // last Period is older than the previous one is already broken.
        if (lastPeriod !== currentPeriod && !followsInStreak(lastPeriod, currentPeriod, profileName)) return 0;
        return current;
    }

    // The Period each started game would count for, by table: by the time
    // its Play is announced, the Period may have changed.
    const startedPeriods = new Map();

    // Fires when a launched table's first window opens (never after a failed
    // launch). Picks this Period's table if nobody asked for it yet (e.g.
    // PinballY left open past midnight), so a table picked by hand on the
    // wheel is compared with this Period's table, never a stale pick.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, ev => {
        if (!ev.game) return;
        const periodTable = getTable();
        if (periodTable && ev.game.configId === periodTable.configId) {
            startedPeriods.set(ev.game.configId, getPeriodKey(host.now()));
        } else {
            startedPeriods.delete(ev.game.configId);
        }
    }));

    // Fires on "gameover" for a Play only; a shorter game leaves its noted
    // Period behind, replaced at that table's next "gamestarted".
    profileStore.onPlay(safeHandler(SCRIPT_NAME, ({ profileName, configId }) => {
        const playedPeriod = startedPeriods.get(configId);
        startedPeriods.delete(configId);
        if (playedPeriod !== undefined) recordPeriodPlayed(playedPeriod, profileName);
    }));

    return { getTable, isOffered, getOfferedTable, launch, getStreak, isPlayedThisPeriod, getLongestStreak, getPeriodsPlayed };
}

let sharedTableOfTheDay = null;
let sharedTableOfTheWeek = null;

// One instance of each for every add-on, so the Streak is recorded once per
// play and the main menu and the achievements agree.
// The first call starts listening for plays, so the Streak is only recorded
// while at least one of those add-ons is enabled.
export function getTableOfTheDay() {
    if (!sharedTableOfTheDay) sharedTableOfTheDay = createPeriodTable(createPinballYHost(), TABLE_OF_THE_DAY, getProfileStore());
    return sharedTableOfTheDay;
}

export function getTableOfTheWeek() {
    if (!sharedTableOfTheWeek) sharedTableOfTheWeek = createPeriodTable(createPinballYHost(), TABLE_OF_THE_WEEK, getProfileStore());
    return sharedTableOfTheWeek;
}
