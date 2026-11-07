// ============================================================
// Household Ratings: a table's Household Rating, the average of the Ratings
// the Household's Profiles (every one but Guest) gave it, rounded to the half
// star, halves up; none under two Ratings. The active Profile's comes from
// PinballY's rating column (ADR 0024), the others' from their ratings.json.
// - The others' files are read once per session, lazily; the Profile left is read again after a switch.
// - Read after the Profile Ratings Add-on's startup, which may first give every Profile its Ratings.
// ============================================================

import { GUEST_NAME, sameName } from "./profile_name_rules.js";
import { ratingOf, readRatingsOf } from "./profile_ratings.js";

const MIN_RATINGS = 2;
const isGuestName = name => sameName(name, GUEST_NAME);
// To the nearest half star, halves up.
const toHalfStar = value => Math.floor(value * 2 + 0.5) / 2;

// host: kept for the shared modules' shape; the store does every read.
export function createHouseholdRatings(host, { profileStore }) {
    // Saved Ratings of each Household Profile but Guest, by listed name; null until the first query.
    let savedRatings = null;
    let activeName = profileStore.getActiveProfile().name;
    const householdNames = () => profileStore.listProfileNames().filter(name => !isGuestName(name));

    function ratingsByProfile() {
        if (savedRatings === null) savedRatings = new Map(householdNames().map(name => [name, null]));
        for (const [name, ratings] of savedRatings) {
            if (ratings === null) savedRatings.set(name, readRatingsOf(profileStore, name));
        }
        return savedRatings;
    }

    // Fires on each Profile change. The Profile Ratings Add-on writes the Profile
    // left back into its file in its own listener: it is only marked here, read
    // at the next query. A Profile created or renamed meanwhile is listed again.
    profileStore.onSwitch(profile => {
        const leftName = activeName;
        activeName = profile.name;
        if (savedRatings === null) return;
        // Keyed by the listed folder names, as the store gives them.
        const known = savedRatings;
        savedRatings = new Map(householdNames().map(name => [name, sameName(name, leftName) ? null : known.get(name) ?? null]));
    });

    // { average, count } of the game's Ratings, or null under two.
    function of(game) {
        const ratings = [];
        const ownRating = ratingOf(game);
        if (ownRating !== null && !isGuestName(activeName)) ratings.push(ownRating);
        for (const [name, saved] of ratingsByProfile()) {
            if (sameName(name, activeName)) continue;
            const rating = saved[game.configId];
            if (rating !== undefined) ratings.push(rating);
        }
        if (ratings.length < MIN_RATINGS) return null;
        const sum = ratings.reduce((total, rating) => total + rating, 0);
        return { average: toHalfStar(sum / ratings.length), count: ratings.length };
    }

    return { of };
}
