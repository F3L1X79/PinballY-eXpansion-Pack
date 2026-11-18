// ============================================================
// Adds a "Hall of Fame" filter to the main menu, before Favorite Tables: a
// ranked Pack Filter of the active Profile's Hall of Fame tables it can see.
// Ranked again when shown, and on a Profile switch or Reset while on the wheel.
// - Ranked: it keeps its ranking whatever the Wheel Order (spec #513).
// - Always in the menu: empty, it stays empty; a Play waits for the next showing.
// ============================================================

import lang from "../common/core/i18n.js";
import { getHallOfFame, HALL_OF_FAME_FILTER_ID } from "../common/stats/hall_of_fame.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getActiveProfileTables } from "../common/tables/visible_tables.js";
import { createPackFilter } from "../common/tables/pack_filter.js";

const SCRIPT_NAME = "HallOfFame";

// Tables to Discover has sort key "5500" and PinballY's "Favorites" filter
// "7000" in the [Top] group.
const BEFORE_FAVORITES_SORT_KEY = "6000";

export default function init() {
    const profileStore = getProfileStore();
    createPackFilter(createPinballYHost(), {
        scriptName: SCRIPT_NAME,
        id: HALL_OF_FAME_FILTER_ID,
        title: lang.customMenuLabels.hallOfFameFilter,
        group: "[Top]",
        sortKey: BEFORE_FAVORITES_SORT_KEY,
        ranked: true,
        alwaysInMenu: true,
        selectConfigIds: () => getHallOfFame(getActiveProfileTables(), profileStore.getPlay).map(game => game.configId),
        runAgainOn: [profileStore.onSwitch, profileStore.onActiveProfileReset],
    });
}
