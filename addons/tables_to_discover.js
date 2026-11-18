// ============================================================
// Adds a "Tables to Discover" filter to the main menu, before the Hall of
// Fame: a Pack Filter of the tables the active Profile can see and never
// played, in the Wheel Order. Recomputed when shown, and on a Profile switch
// or Reset while on the wheel.
// - Always in the menu: empty, it stays empty; a Play waits for the next showing.
// ============================================================

import lang from "../common/core/i18n.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getActiveProfileTables } from "../common/tables/visible_tables.js";
import { getTablesToDiscover, TABLES_TO_DISCOVER_FILTER_ID } from "../common/tables/tables_to_discover.js";
import { createPackFilter } from "../common/tables/pack_filter.js";

const SCRIPT_NAME = "TablesToDiscover";

// Challenge Tables has sort key "5000" and the Hall of Fame "6000" in the
// [Top] group, so the Favorite Tables stay right under the Hall of Fame.
const BEFORE_HALL_OF_FAME_SORT_KEY = "5500";

export default function init() {
    const profileStore = getProfileStore();
    createPackFilter(createPinballYHost(), {
        scriptName: SCRIPT_NAME,
        id: TABLES_TO_DISCOVER_FILTER_ID,
        title: lang.customMenuLabels.tablesToDiscoverFilter,
        group: "[Top]",
        sortKey: BEFORE_HALL_OF_FAME_SORT_KEY,
        alwaysInMenu: true,
        selectConfigIds: () => getTablesToDiscover(getActiveProfileTables(), profileStore).map(game => game.configId),
        runAgainOn: [profileStore.onSwitch, profileStore.onActiveProfileReset],
    });
}
