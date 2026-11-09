// ============================================================
// Untracked Tables: the tables listed in UNTRACKED_TABLES (config.js fills
// the list at load), which stay on the wheel and launch but count for nothing.
// - Imports nothing: pinbally_host.js reads it, and config.js already depends on that host.
// ============================================================

let untrackedTitles = new Set();

// text: comma-separated table titles; each is trimmed, empty ones ignored.
export function setUntrackedTables(text) {
    untrackedTitles = new Set(text.split(",").map(title => title.trim()).filter(title => title !== ""));
}

export const isUntrackedTable = game => untrackedTitles.has(game.title);

// The config IDs of the untracked tables among these, for the saved Plays,
// which name their table by config ID alone.
export const untrackedConfigIdsOf = tables => new Set(tables.filter(isUntrackedTable).map(game => game.configId));
