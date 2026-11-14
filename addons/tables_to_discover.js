// ============================================================
// Adds a "Tables to Discover" filter to the main menu, before the Hall of
// Fame: the tables the active Profile can see and never played, in the Wheel Order.
// Recomputed when the filter is activated, and on a Profile switch or Reset
// while the filter is on the wheel.
// ============================================================

import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getActiveProfileTables } from "../common/tables/visible_tables.js";
import {
    getTablesToDiscover, TABLES_TO_DISCOVER_FILTER_ID, TABLES_TO_DISCOVER_FULL_FILTER_ID,
} from "../common/tables/tables_to_discover.js";
import { WHEEL_ORDER_SORT } from "../common/tables/wheel_order.js";

const SCRIPT_NAME = "TablesToDiscover";

// Challenge Tables has sort key "5000" and the Hall of Fame "6000" in the
// [Top] group, so the Favorite Tables stay right under the Hall of Fame.
const BEFORE_HALL_OF_FAME_SORT_KEY = "5500";

export default function init() {
    const { tablesToDiscoverFilter: FILTER_TITLE } = lang.customMenuLabels;
    const profileStore = getProfileStore();
    const host = createPinballYHost();

    // The ids of the tables to discover, kept after the scan for select().
    let gameIds = new Set();

    // Through the host, which keeps compareForSort for the status line.
    host.createFilter({
        id: TABLES_TO_DISCOVER_FILTER_ID,
        title: FILTER_TITLE,
        group: "[Top]",
        sortKey: BEFORE_HALL_OF_FAME_SORT_KEY,
        // Fires each time the filter is activated, before PinballY scans the tables.
        before: safeHandler(SCRIPT_NAME, () => {
            gameIds = new Set(getTablesToDiscover(getActiveProfileTables(), profileStore).map(game => game.id));
        }),
        select: game => gameIds.has(game.id),
        ...WHEEL_ORDER_SORT,
    });

    // refreshFilter() runs the filter again, so its before() reads the new
    // Profile's plays.
    const refreshIfOnWheel = () => {
        // The Active Filter is the chosen one here: the Wheel Order's sorted copy never stands in for a pack filter.
        if (host.getCurrentFilterId() === TABLES_TO_DISCOVER_FULL_FILTER_ID) host.refreshFilter();
    };
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, refreshIfOnWheel));
    // Fires after any change of a Profile's data: only the active Profile's
    // reset changes the selection on the wheel at once (a Play waits for the
    // next time the filter is shown).
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, (profileName, { isReset }) => {
        if (isReset && profileName === profileStore.getActiveProfile().name) refreshIfOnWheel();
    }));
}
