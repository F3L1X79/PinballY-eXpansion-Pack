// ============================================================
// Single source for "the tables the active Profile can see": PinballY's list
// without the hidden and unconfigured tables and, for a Child Profile, the
// Adult Tables. Read-only, no side effects.
// - The Period Table pick deliberately reads the household's visible tables instead.
// - Unconfigured tables are left out even on a wheel that shows them (spec #405).
// ============================================================

import { createPinballYHost, isVisibleTable } from "../core/pinbally_host.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { isKeptFromChild } from "./adult_tables.js";

// Whether the named Profile (the active one by default) can see this table.
export const isVisibleTo = (game, profileStore, profileName) =>
    isVisibleTable(game) && !isKeptFromChild(game, profileStore, profileName);

// The tables, among the household's visible ones, that the named Profile
// (the active one by default) can see.
export function tablesVisibleTo(visibleTables, profileStore, profileName) {
    return visibleTables.filter(game => isVisibleTo(game, profileStore, profileName));
}

// asNonChild: the tables as a Profile that is not a child would see them,
// Adult Tables included, for the Player Level's scaling. profileName: as
// that Profile would see them (the active one by default).
export function getActiveProfileTables({ asNonChild = false, profileName } = {}) {
    const visibleTables = createPinballYHost().getVisibleTables();
    return asNonChild ? visibleTables : tablesVisibleTo(visibleTables, getProfileStore(), profileName);
}

// Collection completion: how many of a Profile's tables its plays (from
// its profile.json) count at least once.
export function countPlayedTablesIn(profileTables, plays) {
    return profileTables.filter(game => (plays[game.configId] || { count: 0 }).count > 0).length;
}

// The same for the tables the active Profile can see.
export function countPlayedTables(profileTables, profileStore) {
    return countPlayedTablesIn(profileTables, profileStore.getProfileData().plays);
}

// The tables the active Profile can see and never played: the other side
// of collection completion.
export function getUnplayedTables(profileTables, profileStore) {
    return profileTables.filter(game => !profileStore.hasPlayed(game.configId));
}
