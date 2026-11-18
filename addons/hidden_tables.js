// ============================================================
// Hidden Tables: adds the "Hidden Tables" entry to the main menu, right
// under the Favorite Tables, while at least one table is hidden; choosing it puts
// the hidden tables on the wheel (see common/tables/hidden_tables.js).
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getMainMenu } from "../common/menus/main_menu.js";
import { createHiddenTables } from "../common/tables/hidden_tables.js";

export default function init() {
    createHiddenTables(createPinballYHost(), { profileStore: getProfileStore(), mainMenu: getMainMenu() });
}
