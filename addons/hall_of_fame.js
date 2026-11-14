// ============================================================
// Adds a "Hall of Fame" filter to the main menu, before Favorite Tables:
// the active Profile's Hall of Fame tables it can see, in the Wheel Order.
// They are recomputed when the filter is activated, and on a Profile
// switch or Reset while the filter is on the wheel.
// ============================================================

import lang from "../common/core/i18n.js";
import { getHallOfFame, HALL_OF_FAME_FILTER_ID, HALL_OF_FAME_FULL_FILTER_ID } from "../common/stats/hall_of_fame.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getActiveProfileTables } from "../common/tables/visible_tables.js";
import { compareInWheelOrder } from "../common/tables/wheel_order.js";

const SCRIPT_NAME = "HallOfFame";

// Tables to Discover has sort key "5500" and PinballY's "Favorites" filter
// "7000" in the [Top] group.
const BEFORE_FAVORITES_SORT_KEY = "6000";

export default function init() {
    const { hallOfFameFilter: FILTER_TITLE } = lang.customMenuLabels;
    const profileStore = getProfileStore();
    const host = createPinballYHost();

    // The ids of the Hall of Fame tables, kept after the scan for select().
    let gameIds = new Set();

    // Through the host, which keeps compareForSort for the status line.
    host.createFilter({
        id: HALL_OF_FAME_FILTER_ID,
        title: FILTER_TITLE,
        group: "[Top]",
        sortKey: BEFORE_FAVORITES_SORT_KEY,
        // Fires each time the filter is activated, before PinballY scans the tables.
        before: safeHandler(SCRIPT_NAME, () => {
            gameIds = new Set(getHallOfFame(getActiveProfileTables(), profileStore.getPlay).map(game => game.id));
        }),
        select: game => gameIds.has(game.id),
        compareForSort: compareInWheelOrder,
    });

    // refreshFilter() runs the filter again, so its before() picks the new
    // Profile's most played tables.
    const refreshIfOnWheel = () => {
        // The Active Filter is the chosen one here: the Wheel Order's sorted copy never stands in for a pack filter.
        if (host.getCurrentFilterId() === HALL_OF_FAME_FULL_FILTER_ID) host.refreshFilter();
    };
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, refreshIfOnWheel));
    // Fires after any change of a Profile's data: only the active Profile's
    // reset empties its selection at once (a Play waits for the next time
    // the filter is shown).
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, (profileName, { isReset }) => {
        if (isReset && profileName === profileStore.getActiveProfile().name) refreshIfOnWheel();
    }));
}
