// ============================================================
// Adds a "Hall of Fame" filter to the main menu, before Favorite Tables:
// the active Profile's Hall of Fame tables it can see, in rank order.
// The ranking is recomputed when the filter is activated, and on a Profile
// switch or Reset while the filter is on the wheel.
// - A ranked wheel selection: it keeps its ranking whatever the Wheel Order (spec #513).
// ============================================================

import lang from "../common/core/i18n.js";
import { getHallOfFame, HALL_OF_FAME_FILTER_ID, HALL_OF_FAME_FULL_FILTER_ID } from "../common/stats/hall_of_fame.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getActiveProfileTables } from "../common/tables/visible_tables.js";

const SCRIPT_NAME = "HallOfFame";

// Tables to Discover has sort key "5500" and PinballY's "Favorites" filter
// "7000" in the [Top] group.
const BEFORE_FAVORITES_SORT_KEY = "6000";

export default function init() {
    const { hallOfFameFilter: FILTER_TITLE } = lang.customMenuLabels;
    const profileStore = getProfileStore();
    const host = createPinballYHost();

    // Rank (from 1) of each Hall of Fame table, by game id. Kept after the
    // scan: PinballY sorts and pages the wheel with it once select() is done.
    let ranks = new Map();

    // Through the host, which keeps compareForSort for the status line.
    host.createFilter({
        id: HALL_OF_FAME_FILTER_ID,
        title: FILTER_TITLE,
        group: "[Top]",
        sortKey: BEFORE_FAVORITES_SORT_KEY,
        // Fires each time the filter is activated, before PinballY scans the tables.
        before: safeHandler(SCRIPT_NAME, () => {
            const hallOfFame = getHallOfFame(getActiveProfileTables(), profileStore.getPlay);
            ranks = new Map(hallOfFame.map((game, index) => [game.id, index + 1]));
        }),
        select: game => ranks.has(game.id),
        compareForSort: (a, b) => ranks.get(a.id) - ranks.get(b.id),
        // Group 0 would make the wheel skip the table, so ranks start at 1.
        pageGroup: game => ranks.get(game.id),
    });

    // refreshFilter() runs the filter again, so its before() ranks the new
    // Profile's tables.
    const refreshIfOnWheel = () => {
        // The Active Filter is the chosen one here: the Wheel Order's sorted copy never stands in for a pack filter.
        if (host.getCurrentFilterId() === HALL_OF_FAME_FULL_FILTER_ID) host.refreshFilter();
    };
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, refreshIfOnWheel));
    // Fires after any change of a Profile's data: only the active Profile's
    // reset empties its ranking at once (a game only moves it).
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, (profileName, { isReset }) => {
        if (isReset && profileName === profileStore.getActiveProfile().name) refreshIfOnWheel();
    }));
}
