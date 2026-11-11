// ============================================================
// Rocket Game scores: each finished game saved among the active Profile's
// five best (profile.json's "rocketScores"), and the Rocket Board, the
// Household's five best (Guest left out), built from those saved scores.
// - Guest's scores are saved like any Profile's, only left off the board.
// - A Profile Reset drops "rocketScores" with the rest of the Profile data: no listener here.
// ============================================================

import { toLocalIsoString } from "../profiles/profile_store.js";
import { GUEST_NAME, sameName } from "../profiles/profile_name_rules.js";

const BEST_KEPT = 5;

// Highest first; the first score keeps the higher place on a tie.
const byRank = (a, b) => b.score - a.score || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const isSameLine = (a, b) => sameName(a.profileName, b.profileName) && a.score === b.score && a.date === b.date;

export function createRocketBoard(host, { profileStore }) {
    // Saves the active Profile's score when it is among its five best.
    // Returns the board line it makes, { profileName, score, date }, or null.
    function record(score) {
        const profileName = profileStore.getActiveProfile().name;
        const entry = { score, date: toLocalIsoString(host.now()) };
        const best = [...profileStore.getRocketScoresOf(profileName), entry].sort(byRank).slice(0, BEST_KEPT);
        if (!best.includes(entry)) return null;
        profileStore.updateProfileData(data => { data.rocketScores = best; });
        return { profileName, ...entry };
    }

    // The Household's five best, { profileName, score, date } best first, and
    // the index of recorded (record()'s line) among them, -1 when off the board.
    function board(recorded) {
        const lines = profileStore.withCachedReads(() => profileStore.listProfileNames()
            .filter(name => !sameName(name, GUEST_NAME))
            .flatMap(profileName => profileStore.getRocketScoresOf(profileName).map(({ score, date }) => ({ profileName, score, date }))))
            .sort(byRank)
            .slice(0, BEST_KEPT);
        return { lines, highlighted: recorded ? lines.findIndex(line => isSameLine(line, recorded)) : -1 };
    }

    return { record, board };
}
