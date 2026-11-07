// ============================================================
// Profile Ratings: each Profile's Ratings and Favorite Tables, in its own
// ratings.json through the Profile store; PinballY's rating / isFavorite columns
// hold the active Profile's (docs/adr/0024), and the cabinet's profile_ratings.json
// names whose. start() runs once, at startup.
// - The columns are the truth for the active Profile: the pack never hooks the rating dialog.
// - A table no longer in the game list keeps its entry in every file.
// ============================================================

import { sameName } from "./profile_name_rules.js";

const SCRIPT_NAME = "ProfileRatings";
const RATINGS_FILE = "ratings";
const RECORD_FILE = "profile_ratings";
// Bumped only for a breaking format change (ADR 0016); a newer file is set aside.
const RATINGS_VERSION = 1;
const RECORD_VERSION = 1;

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
// PinballY's -1 means no Rating.
const ratingOf = game => (typeof game.rating === "number" && game.rating >= 0 ? game.rating : null);

export function createProfileRatings(host, { profileStore }) {
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);

    // A Profile with no file has no Rating and no Favorite Table.
    function readValues(profileName) {
        const saved = profileStore.readProfileFile(profileName, RATINGS_FILE, RATINGS_VERSION) || {};
        return {
            version: RATINGS_VERSION,
            ratings: isRecord(saved.ratings) ? { ...saved.ratings } : {},
            favorites: Array.isArray(saved.favorites) ? saved.favorites.filter(id => typeof id === "string") : [],
        };
    }

    // The values with every table of the game list as the columns hold it.
    function withColumns(values, tables) {
        const ratings = { ...values.ratings };
        const favorites = new Set(values.favorites);
        for (const game of tables) {
            const rating = ratingOf(game);
            if (rating === null) delete ratings[game.configId];
            else ratings[game.configId] = rating;
            if (game.isFavorite === true) favorites.add(game.configId);
            else favorites.delete(game.configId);
        }
        return { ...values, ratings, favorites: [...favorites] };
    }

    // Written only when something changed: this runs at every startup.
    function keepColumnsIn(profileName, tables) {
        const saved = readValues(profileName);
        const kept = withColumns(saved, tables);
        if (JSON.stringify(kept) !== JSON.stringify(saved)) profileStore.saveProfileFile(profileName, RATINGS_FILE, kept);
    }

    const saveRecord = profileName =>
        profileStore.saveCabinetFile(RECORD_FILE, { version: RECORD_VERSION, columnsProfile: profileName });

    function start() {
        const activeName = profileStore.getActiveProfile().name;
        const tables = host.getAllTables();
        const record = profileStore.readCabinetFile(RECORD_FILE, RECORD_VERSION);
        if (!record) {
            // The record last: a crash before it only runs the copy again.
            const profileNames = profileStore.listProfileNames();
            for (const profileName of profileNames) keepColumnsIn(profileName, tables);
            saveRecord(activeName);
            log(`First run: the cabinet's Ratings and Favorite Tables were given to every Profile (${profileNames.length}).`);
            return;
        }
        if (typeof record.columnsProfile === "string" && sameName(record.columnsProfile, activeName)) {
            keepColumnsIn(activeName, tables);
            return;
        }
        log(`PinballY's columns hold the values of "${record.columnsProfile}", not of the active Profile "${activeName}"; left as they are.`);
    }

    return { start };
}
