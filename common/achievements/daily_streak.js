// ============================================================
// Daily Streak: a Profile's days in a row on the cabinet, read from its Play
// Log whenever asked, so nothing is persisted. Shared through getDailyStreak().
// Also tells the days since a Profile's last Play. No event, no side effect.
// - A Profile Reset sets the Play Log aside, so it brings the streak back to 0.
// - The day changes at midnight, as for the Table of the Day.
// ============================================================

import { createPinballYHost } from "../core/pinbally_host.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { formatDateKey, shiftDateKey } from "../tables/period_table.js";

const dayBefore = date => new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);

// The longest run of consecutive days, across month and year ends: the
// day keys sort as dates.
function longestRun(days) {
    let longest = 0;
    let length = 0;
    let previous = null;
    for (const day of [...days].sort()) {
        length = previous !== null && shiftDateKey(day, -1) === previous ? length + 1 : 1;
        longest = Math.max(longest, length);
        previous = day;
    }
    return longest;
}

export function createDailyStreak(host, store) {
    // The day keys of the named Profile's Plays: a Play Log start is local
    // time, "2026-10-07T21:10:00", whose date part is the day key.
    function playedDays(name) {
        const days = new Set();
        for (const year of store.getPlayLogYearsOf(name)) {
            for (const play of store.getPlayLogOf(name, year)) days.add(String(play.start).slice(0, 10));
        }
        return days;
    }

    // { current, longest, isTodayCounted }: current counts back from today when it
    // counts, else from yesterday, so the Daily Streak stays alive all day.
    function read(profileName = store.getActiveProfile().name) {
        const days = playedDays(profileName);
        const today = host.now();
        const isTodayCounted = days.has(formatDateKey(today));
        let current = 0;
        for (let day = isTodayCounted ? today : dayBefore(today); days.has(formatDateKey(day)); day = dayBefore(day)) current++;
        return { current, longest: longestRun(days), isTodayCounted };
    }

    // Calendar days from the named Profile's last Play to today; null
    // without any Play.
    function daysSinceLastPlay(profileName) {
        const days = [...playedDays(profileName)];
        if (days.length === 0) return null;
        const [year, month, day] = days.reduce((last, key) => (key > last ? key : last)).split("-").map(Number);
        const now = host.now();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Rounded: a day across a clock change lasts 23 or 25 hours.
        return Math.round((today - new Date(year, month - 1, day)) / 86400000);
    }

    return { read, daysSinceLastPlay };
}

let sharedDailyStreak = null;

export function getDailyStreak() {
    if (!sharedDailyStreak) sharedDailyStreak = createDailyStreak(createPinballYHost(), getProfileStore());
    return sharedDailyStreak;
}
