// ============================================================
// Calibration: rebuilds each Profile's last 8 complete weeks from its Play
// Log as game records, so that a Challenge or Household Challenge draw targets
// a bit more than a very good week (the second best week plus 1), per Profile
// or for the Household together. Reads Play Log files only.
// - Guest's Plays never count, nor make the Play Log old enough.
// - A Play on a table gone from the collection has no manufacturer nor decade.
// - A Play on a table the Profile can no longer see counts nowhere, as in a Challenge.
// ============================================================

import { getWeekKey, shiftDateKey } from "../tables/period_table.js";
import { getDecadeStartYear } from "../achievements/decade.js";
import { isVisibleTo } from "../tables/visible_tables.js";

export const CALIBRATION_WEEKS = 8;
// Below this many complete weeks of Play Log, draws keep the fixed ranges.
export const CALIBRATION_MIN_WEEKS = 4;

// A game record's manufacturer and decade, read from the table's metadata.
export const manufacturerOf = table => table.manufacturer || "";
export const decadeOf = table => getDecadeStartYear(table.year);

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})/;
const dayKeyOf = play => {
    const match = DAY_KEY.exec(String(play.start));
    return match ? match[0] : null;
};
const weekOfDay = dayKey => {
    const [year, month, day] = dayKey.split("-").map(Number);
    return getWeekKey(new Date(year, month - 1, day));
};
const yearOfWeek = weekKey => Number(weekKey.slice(0, 4));

// The second best of the weekly values plus 1: a week's value is 0 without any Play.
export function secondBestPlusOne(weeklyValues) {
    const sorted = [...weeklyValues].sort((a, b) => b - a);
    return (sorted[1] || 0) + 1;
}

// The middle value; of two middle ones, their mean rounded up.
export function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[middle];
    return Math.ceil((sorted[middle - 1] + sorted[middle]) / 2);
}

// A calibrated value as a target: at least range.min, at most the
// option's cap; it may exceed range.max.
export const clampTarget = (value, range, cap) => Math.min(cap, Math.max(range.min, value));

export function createCalibration(host, profileStore) {
    const playerNames = () => profileStore.listProfiles().filter(profile => !profile.isGuest).map(profile => profile.name);

    // Whether a Play of the Household, Guest left out, started at least
    // CALIBRATION_MIN_WEEKS complete weeks before now's week.
    function hasEnoughPlayLog(now) {
        const lastAllowedWeek = shiftDateKey(getWeekKey(now), -7 * CALIBRATION_MIN_WEEKS);
        // A week starting late in December has Plays in the next year's file.
        const lastYear = yearOfWeek(lastAllowedWeek) + 1;
        return playerNames().some(name => profileStore.getPlayLogYearsOf(name)
            .filter(year => year <= lastYear)
            .some(year => profileStore.getPlayLogOf(name, year).some(play => {
                const day = dayKeyOf(play);
                return day !== null && weekOfDay(day) <= lastAllowedWeek;
            })));
    }

    // The named Profile's game records of each of the last complete weeks,
    // oldest first, with only what the Play Log and the table's metadata
    // tell; null when it has no Play in them.
    function weeklyGamesOf(profileName, now) {
        const firstWeek = shiftDateKey(getWeekKey(now), -7 * CALIBRATION_WEEKS);
        const weeks = Array.from({ length: CALIBRATION_WEEKS }, (_, index) => shiftDateKey(firstWeek, 7 * index));
        const games = weeks.map(() => []);
        // By table: whether it counts, and its metadata (null for a gone table).
        const tables = new Map();
        const tableOf = configId => {
            if (!tables.has(configId)) {
                const table = host.getGameInfo(configId);
                tables.set(configId, { table, counts: !table || isVisibleTo(table, profileStore, profileName) });
            }
            return tables.get(configId);
        };
        const years = profileStore.getPlayLogYearsOf(profileName)
            .filter(year => year >= yearOfWeek(firstWeek) && year <= now.getFullYear());
        for (const year of years) {
            for (const play of profileStore.getPlayLogOf(profileName, year)) {
                const day = dayKeyOf(play);
                const index = day === null ? -1 : weeks.indexOf(weekOfDay(day));
                const { table, counts } = tableOf(play.configId);
                if (index < 0 || !counts) continue;
                games[index].push({
                    configId: play.configId,
                    manufacturer: table ? manufacturerOf(table) : "",
                    decade: table ? decadeOf(table) : null,
                    day,
                    seconds: Number(play.seconds) || 0,
                });
            }
        }
        return games.some(week => week.length > 0) ? games : null;
    }

    // The target of weekly values given by valueOf(games): the median across
    // the named Profiles (Guest left out) of their second best week plus 1,
    // clamped; null without enough Play Log or with no Play in the weeks.
    function targetFor(profileNames, valueOf, { range, cap }, now = host.now()) {
        if (!hasEnoughPlayLog(now)) return null;
        const players = new Set(playerNames());
        const values = profileNames
            .filter(name => players.has(name))
            .map(name => weeklyGamesOf(name, now))
            .filter(weeks => weeks !== null)
            .map(weeks => secondBestPlusOne(weeks.map(valueOf)));
        return values.length > 0 ? clampTarget(median(values), range, cap) : null;
    }

    // The Household's target: each week's value over every Profile's game
    // records together (Guest left out), as the Household Challenge counts
    // them; its second best week plus 1, clamped. Null as for targetFor.
    function householdTargetFor(valueOf, { range, cap }, now = host.now()) {
        if (!hasEnoughPlayLog(now)) return null;
        const profileWeeks = playerNames().map(name => weeklyGamesOf(name, now)).filter(weeks => weeks !== null);
        if (profileWeeks.length === 0) return null;
        const weeks = Array.from({ length: CALIBRATION_WEEKS }, (_, index) => profileWeeks.flatMap(games => games[index]));
        return clampTarget(secondBestPlusOne(weeks.map(valueOf)), range, cap);
    }

    return { hasEnoughPlayLog, weeklyGamesOf, targetFor, householdTargetFor };
}
