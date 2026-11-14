// ============================================================
// Selection filter: a script filter putting on the wheel a list of tables an
// Add-on computes (Challenge Tables, My High Scores). Returns the filter's
// full id ("User.<id>") and runAgainIfCurrent. Listens to "wheelmode".
// - Runs again only when its tables changed, so closing a menu never moves the wheel.
// - Listed in the Wheel Order, unless ranked: then in its own order, each table its own Next/Previous Page stop.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { ALL_TABLES_FILTER } from "../core/pinbally_host.js";

// compareForSort: how an unranked selection sorts (the Add-ons pass the Wheel Order's).
export function createSelectionFilter(host, { scriptName, selectConfigIds, ranked = false, compareForSort, ...filter }) {
    const filterId = `User.${filter.id}`;
    // Kept after the scan, like PinballY keeps the filter's selection: the
    // position of each table, by config ID.
    let configIds = [];
    let positions = new Map();
    const sameTables = tables => tables.length === configIds.length && tables.every((configId, index) => configId === configIds[index]);
    // PinballY sorts and pages the wheel with these once select() is done.
    const sortFields = ranked ? {
        compareForSort: (a, b) => positions.get(a.configId) - positions.get(b.configId),
        // Group 0 would make the wheel skip the table, so groups start at 1.
        pageGroup: game => positions.get(game.configId) + 1,
    } : { compareForSort };

    host.createFilter({
        ...filter,
        ...sortFields,
        // Fires each time the filter runs, before PinballY scans the tables.
        before: safeHandler(scriptName, () => {
            configIds = selectConfigIds();
            positions = new Map(configIds.map((configId, index) => [configId, index]));
        }),
        select: game => positions.has(game.configId),
    });

    const runAgainIfCurrent = () => {
        // The Active Filter is the chosen one here: the Wheel Order's sorted copy never stands in for a pack filter.
        if (host.getCurrentFilterId() !== filterId) return;
        const tables = selectConfigIds();
        if (tables.length === 0) host.setCurrentFilter(ALL_TABLES_FILTER);
        else if (!sameTables(tables)) host.refreshFilter();
    };
    // Fires on each return to the wheel (after a game, a menu, a Profile switch).
    host.on("wheelmode", safeHandler(scriptName, runAgainIfCurrent));

    return { filterId, runAgainIfCurrent };
}
