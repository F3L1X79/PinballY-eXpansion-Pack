// ============================================================
// Pack Filter: a wheel selection of the tables an Add-on computes (Challenge
// Tables, Hall of Fame...), listed and paged in the Wheel Order unless
// ranked. Runs again on "wheelmode" (unless alwaysInMenu) and on runAgainOn events.
// packFilterSortOf() tells how a Pack Filter lists and pages its tables.
// - Runs again only when its tables changed, so closing a menu never moves the wheel.
// - Emptied, it gives way to All Tables through the Wheel Order (its sorted copy while by year), unless alwaysInMenu.
// - Ranked, each table is its own Next/Previous Page stop. PinballY gives no filter's pageGroup back.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { ALL_TABLES_FILTER } from "../core/pinbally_host.js";
import { getWheelOrder } from "./wheel_order.js";

export const PACK_FILTER_PAGINGS = Object.freeze({ WHEEL_ORDER: "wheelOrder", RANKED: "ranked" });

// The Pack Filters created this session, by full id: shared, like PinballY's filters.
const packFilters = new Map();

// How the Pack Filter with this full id lists its tables: { paging, compareForSort },
// paging a PACK_FILTER_PAGINGS value; null for any other filter.
export const packFilterSortOf = filterId => packFilters.get(filterId) ?? null;
export const isPackFilterInWheelOrder = filterId => {
    const packSort = packFilterSortOf(filterId);
    return packSort !== null && packSort.paging === PACK_FILTER_PAGINGS.WHEEL_ORDER;
};

// The given Wheel Order, else the shared one, read when used: the Add-ons' init order does not matter.
const wheelOrderOf = wheelOrder => wheelOrder ?? getWheelOrder();

// selectConfigIds: the tables, in their ranking when ranked. runAgainOn: functions
// each registering a listener, called when the tables may have changed.
// alwaysInMenu: like PinballY's own filters, an emptied selection stays on the
// wheel, and a return to the wheel (after a Play) leaves it until shown again.
// wheelOrder: the shared one unless a unit test passes its own.
// Returns the filter's full id ("User.<id>").
export function createPackFilter(host, {
    scriptName, selectConfigIds, ranked = false, runAgainOn = [], alwaysInMenu = false, wheelOrder, ...filter
}) {
    const filterId = `User.${filter.id}`;
    // Kept after the scan, like PinballY keeps the filter's selection: the
    // position of each table, by config ID.
    let configIds = [];
    let positions = new Map();
    const sameTables = tables => tables.length === configIds.length && tables.every((configId, index) => configId === configIds[index]);
    // PinballY sorts and pages the wheel with these once select() is done.
    const sortFields = ranked
        ? {
            compareForSort: (a, b) => positions.get(a.configId) - positions.get(b.configId),
            // Group 0 would make the wheel skip the table, so groups start at 1.
            pageGroup: game => positions.get(game.configId) + 1,
        }
        : {
            compareForSort: (a, b) => wheelOrderOf(wheelOrder).compareForSort(a, b),
            pageGroup: game => wheelOrderOf(wheelOrder).pageGroup(game),
        };
    packFilters.set(filterId, Object.freeze({
        paging: ranked ? PACK_FILTER_PAGINGS.RANKED : PACK_FILTER_PAGINGS.WHEEL_ORDER,
        compareForSort: sortFields.compareForSort,
    }));

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
        // The Active Filter is the chosen one here: the Wheel Order's sorted copy never stands in for a Pack Filter.
        if (host.getCurrentFilterId() !== filterId) return;
        const tables = selectConfigIds();
        if (tables.length === 0 && !alwaysInMenu) wheelOrderOf(wheelOrder).showFilter(ALL_TABLES_FILTER);
        else if (!sameTables(tables)) host.refreshFilter();
    };
    // Fires on each return to the wheel (after a game, a menu, a Profile switch).
    if (!alwaysInMenu) host.on("wheelmode", safeHandler(scriptName, runAgainIfCurrent));
    for (const register of runAgainOn) register(safeHandler(scriptName, runAgainIfCurrent));

    return { filterId };
}
