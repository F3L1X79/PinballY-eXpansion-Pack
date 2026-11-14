// ============================================================
// Challenge Tables: a selection filter (common/tables/selection_filter.js)
// in the main menu, right under "All Tables", that puts on the wheel the
// tables that would move the active Profile's Challenge forward (see
// common/challenges/challenge.js). Its entry is in the main menu only
// while there are some, checked at each opening.
// ============================================================

import lang from "../core/i18n.js";
import { createSelectionFilter } from "../tables/selection_filter.js";

const SCRIPT_NAME = "ChallengeTables";
// PinballY's "All Tables" has sort key "3000" and the Hall of Fame "6000" in the [Top] group.
const UNDER_ALL_TABLES_SORT_KEY = "5000";

// compareForSort: how the wheel lists them, the Wheel Order's in the Add-on.
export function createChallengeTables(host, challenges, mainMenu, { compareForSort }) {
    const selectConfigIds = () => challenges.getTablesToPlay().map(table => table.configId);
    const { filterId } = createSelectionFilter(host, {
        scriptName: SCRIPT_NAME,
        compareForSort,
        id: "project.ChallengeTables",
        title: lang.customMenuLabels.challengeTables,
        group: "[Top]",
        sortKey: UNDER_ALL_TABLES_SORT_KEY,
        selectConfigIds,
    });
    mainMenu.showFilterWhen(filterId, () => selectConfigIds().length > 0);
}
