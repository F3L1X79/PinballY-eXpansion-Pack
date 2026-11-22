// ============================================================
// Challenge Tables and Household Challenge Tables: Pack Filters
// (common/tables/pack_filter.js) in the main menu, right under "All Tables",
// that put on the wheel the tables that would move the active Profile's
// Challenge, or the Household Challenge, forward. Each entry is in the main
// menu only while there are some, checked at each opening.
// - The Household one runs again on a Profile switch: never played and dusty follow the active Profile.
// ============================================================

import lang from "../core/i18n.js";
import { createPackFilter } from "../tables/pack_filter.js";

// PinballY's "All Tables" has sort key "3000" and the Hall of Fame "6000" in the [Top] group.
const UNDER_ALL_TABLES_SORT_KEY = "5000";
const UNDER_CHALLENGE_TABLES_SORT_KEY = "5500";

// wheelOrder: the shared one unless a unit test passes its own.
function createTablesFilter(host, challenge, mainMenu, { scriptName, id, title, sortKey, runAgainOn = [], wheelOrder }) {
    const selectConfigIds = () => challenge.getTablesToPlay().map(table => table.configId);
    const { filterId } = createPackFilter(host, {
        scriptName, wheelOrder, id, title, group: "[Top]", sortKey, selectConfigIds, runAgainOn,
    });
    mainMenu.showFilterWhen(filterId, () => selectConfigIds().length > 0);
}

export function createChallengeTables(host, challenges, mainMenu, { wheelOrder } = {}) {
    createTablesFilter(host, challenges, mainMenu, {
        scriptName: "ChallengeTables",
        id: "project.ChallengeTables",
        title: lang.customMenuLabels.challengeTables,
        sortKey: UNDER_ALL_TABLES_SORT_KEY,
        wheelOrder,
    });
}

export function createHouseholdChallengeTables(host, householdChallenge, profileStore, mainMenu, { wheelOrder } = {}) {
    createTablesFilter(host, householdChallenge, mainMenu, {
        scriptName: "HouseholdChallengeTables",
        id: "project.HouseholdChallengeTables",
        title: lang.customMenuLabels.householdChallengeTables,
        sortKey: UNDER_CHALLENGE_TABLES_SORT_KEY,
        runAgainOn: [profileStore.onSwitch, profileStore.onActiveProfileReset],
        wheelOrder,
    });
}
