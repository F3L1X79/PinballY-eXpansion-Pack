// ============================================================
// Profile Ratings: each Profile's Ratings and Favorite Tables in its ratings.json;
// PinballY's rating / isFavorite columns hold the active Profile's (docs/adr/0024),
// the cabinet's profile_ratings.json names whose. start() runs once, at startup; each
// Profile change puts the columns back into the Profile left, the next one's onto them.
// One shared instance (getProfileRatings) also counts the active Profile's rated tables.
// - The columns are the truth for the active Profile: the pack never hooks the rating dialog.
// - update() only ever carries rating / isFavorite, and only for a table that differs.
// - A table no longer in the game list keeps its entry in every file.
// - A record naming another Profile or a change under way means mixed columns: startup rewrites them.
// - An unreadable record is never a first run: the copy would overwrite every Profile's values.
// ============================================================

import { sameName } from "./profile_name_rules.js";
import { getProfileStore } from "./profile_store.js";
import { createPinballYHost } from "../core/pinbally_host.js";

const SCRIPT_NAME = "ProfileRatings";
const RATINGS_FILE = "ratings";
const RECORD_FILE = "profile_ratings";
// Bumped only for a breaking format change (ADR 0016); a newer file is set aside.
const RATINGS_VERSION = 1;
const RECORD_VERSION = 1;

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
// PinballY's own rating dialog, opened by Rate Table and by the Rating Prompt:
// it raises no event when a Rating changes, its closing is the cue.
export const RATE_GAME_POPUP = "rate game";
// PinballY's -1 means no Rating.
const NO_RATING = -1;
export const ratingOf = game => (typeof game.rating === "number" && game.rating >= 0 ? game.rating : null);
// A hand edit may leave anything in the file: only 0 to 5 in half steps reaches PinballY.
const isRating = value => typeof value === "number" && value >= 0 && value <= 5 && Number.isInteger(value * 2);

// A Profile with no file has no Rating and no Favorite Table.
function readValuesOf(profileStore, profileName) {
    const saved = profileStore.readProfileFile(profileName, RATINGS_FILE, RATINGS_VERSION) || {};
    return {
        version: RATINGS_VERSION,
        ratings: isRecord(saved.ratings) ? { ...saved.ratings } : {},
        favorites: Array.isArray(saved.favorites) ? saved.favorites.filter(id => typeof id === "string") : [],
    };
}

// The named Profile's saved Ratings by config ID, through the store; only
// those of 0 to 5 in half steps. An inactive Profile's are its true values.
export function readRatingsOf(profileStore, profileName) {
    const { ratings } = readValuesOf(profileStore, profileName);
    return Object.fromEntries(Object.entries(ratings).filter(([, rating]) => isRating(rating)));
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

export function createProfileRatings(host, { profileStore }) {
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    const readValues = profileName => readValuesOf(profileStore, profileName);

    // Written only when something changed: this runs at every startup.
    function keepColumnsIn(profileName, tables) {
        const saved = readValues(profileName);
        const kept = withColumns(saved, tables);
        if (JSON.stringify(kept) !== JSON.stringify(saved)) profileStore.saveProfileFile(profileName, RATINGS_FILE, kept);
    }

    // One update() per table that differs, with only the fields that differ:
    // each one writes PinballY's database and refreshes the wheel.
    function putOnColumns(values, tables) {
        const favorites = new Set(values.favorites);
        for (const game of tables) {
            const saved = values.ratings[game.configId];
            const rating = isRating(saved) ? saved : NO_RATING;
            const isFavorite = favorites.has(game.configId);
            const changes = {};
            if ((ratingOf(game) ?? NO_RATING) !== rating) changes.rating = rating;
            if ((game.isFavorite === true) !== isFavorite) changes.isFavorite = isFavorite;
            if (Object.keys(changes).length > 0) game.update(changes);
        }
    }

    // The Profile whose values PinballY's columns hold; null until start() knows.
    let columnsProfile = null;
    const saveRecord = (profileName, change) => profileStore.saveCabinetFile(RECORD_FILE, {
        version: RECORD_VERSION, columnsProfile: profileName, ...(change ? { change } : {}),
    });

    // Marked "under way" first: a crash halfway leaves a record that startup repairs.
    function moveColumnsTo(profileName, tables, fromName) {
        saveRecord(fromName, { from: fromName, to: profileName });
        putOnColumns(readValues(profileName), tables);
        saveRecord(profileName);
        columnsProfile = profileName;
    }

    // Fires on each Profile change, the next Profile already active.
    function onSwitch(profile) {
        const tables = host.getAllTables();
        const leftName = columnsProfile;
        // Cleared first: after a failure below, the columns no longer hold one known
        // Profile's values, and the next switch must not save them into anyone's file.
        columnsProfile = null;
        // A Profile renamed away while PinballY runs has no file left to keep its values in.
        if (leftName !== null && profileStore.listProfileNames().some(name => sameName(name, leftName))) {
            keepColumnsIn(leftName, tables);
        }
        moveColumnsTo(profile.name, tables, leftName);
    }

    function start() {
        profileStore.onSwitch(onSwitch);
        const activeName = profileStore.getActiveProfile().name;
        const tables = host.getAllTables();
        // Asked first: reading an unreadable record sets it aside.
        const wasSaved = profileStore.hasCabinetFile(RECORD_FILE);
        const record = profileStore.readCabinetFile(RECORD_FILE, RECORD_VERSION);
        if (!record && !wasSaved) {
            // The record last: a crash before it only runs the copy again.
            const profileNames = profileStore.listProfileNames();
            for (const profileName of profileNames) keepColumnsIn(profileName, tables);
            saveRecord(activeName);
            columnsProfile = activeName;
            log(`First run: the cabinet's Ratings and Favorite Tables were given to every Profile (${profileNames.length}).`);
            return;
        }
        // An unreadable record (set aside and logged by the store) is never a first run:
        // the copy would overwrite every Profile's own values.
        const columnsName = record ? record.columnsProfile : activeName;
        const isUnderWay = record !== null && record.change !== undefined;
        if (typeof columnsName === "string" && sameName(columnsName, activeName) && !isUnderWay) {
            keepColumnsIn(activeName, tables);
            if (!record) saveRecord(activeName);
            columnsProfile = activeName;
            return;
        }
        // Two Profiles mixed, or the columns' Profile renamed away: none of it is kept.
        log(`PinballY's columns are not trusted (they named "${columnsName}"${isUnderWay ? ", a change under way" : ""});`
            + ` the active Profile "${activeName}"'s values are written to them.`);
        moveColumnsTo(activeName, tables, typeof columnsName === "string" ? columnsName : null);
    }

    // How many tables the active Profile has rated, gone and Adult Tables
    // included. The columns count only once they hold its values: a
    // listener of the same switch running before onSwitch reads its file,
    // which is what onSwitch puts on them.
    function countRatedTables() {
        const activeName = profileStore.getActiveProfile().name;
        const saved = readValues(activeName);
        const isOnColumns = columnsProfile !== null && sameName(columnsProfile, activeName);
        const { ratings } = isOnColumns ? withColumns(saved, host.getAllTables()) : saved;
        return Object.values(ratings).filter(isRating).length;
    }

    return { start, countRatedTables };
}

let sharedProfileRatings = null;

// One instance for the Profile Ratings Add-on and the Ratings family, so
// the count knows whose values the columns hold.
export function getProfileRatings() {
    if (!sharedProfileRatings) sharedProfileRatings = createProfileRatings(createPinballYHost(), { profileStore: getProfileStore() });
    return sharedProfileRatings;
}
