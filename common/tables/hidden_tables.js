// ============================================================
// Hidden Tables: a Pack Filter (common/tables/pack_filter.js)
// in the main menu, right under the Favorite Tables, that puts on the wheel the
// tables carrying PinballY's Hidden flag, the Adult Tables left out for a
// Child Profile. Its entry is in the main menu only while there are some,
// checked at each opening; no Profile mark restricts it.
// ============================================================

import lang from "../core/i18n.js";
import { createPackFilter } from "./pack_filter.js";
import { isKeptFromChild } from "./adult_tables.js";

const SCRIPT_NAME = "HiddenTables";
// PinballY's "Favorites" filter has sort key "7000" in the [Top] group.
const UNDER_FAVORITES_SORT_KEY = "7500";

export function createHiddenTables(host, { profileStore, mainMenu }) {
    // The child wheel metafilter already keeps the Adult Tables off the
    // wheel; left out here too, so that the entry follows what the wheel shows.
    const selectConfigIds = () => host.getAllTables()
        .filter(game => game.isHidden && !isKeptFromChild(game, profileStore))
        .map(game => game.configId);
    const { filterId } = createPackFilter(host, {
        scriptName: SCRIPT_NAME,
        id: "project.HiddenTables",
        title: lang.customMenuLabels.hiddenTablesFilter,
        group: "[Top]",
        sortKey: UNDER_FAVORITES_SORT_KEY,
        // Otherwise PinballY never passes a hidden table to select() (FilterInfo).
        includeHidden: true,
        selectConfigIds,
    });
    mainMenu.showFilterWhen(filterId, () => selectConfigIds().length > 0);
}
