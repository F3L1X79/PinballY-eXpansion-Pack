// ============================================================
// Adds "Table Setup" to the main menu through the main menu module, and
// "Manage profiles" to the Operator Menu and the Exit menu's player group.
// Listens to "menuopen" and "command".
// - With an Admin Profile, only Admins see "Table Setup", "Operator Menu" and "Manage profiles".
// - With none, "Manage profiles" offers "Become admin" to all but Guest and Child Profiles.
// - The coin door service button still opens the Operator Menu for anyone.
// ============================================================

import { safeHandler } from "../common/core/safe_handler.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { seesSetupEntries, seesManageProfiles } from "../common/profiles/setup_entries.js";
import { getMainMenu, MAIN_MENU_POSITION } from "../common/menus/main_menu.js";
import { createManageProfilesMenu } from "../common/menus/manage_profiles_menu.js";
import { addToPlayerGroup, PLAYER_GROUP_RANK } from "../common/menus/exit_menu.js";
import { getDrawnMenus } from "../common/drawn_menu/drawn_menu.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import lang from "../common/core/i18n.js";

const SCRIPT_NAME = "CustomMenuCommands";

export default function init() {
    const { customMenuLabels: MENU_LABELS } = lang;
    const profileStore = getProfileStore();
    const showsSetupEntries = () => seesSetupEntries(profileStore);

    const MENU_COMMANDS = [
        {
            name: "showTableSetup",
            label: MENU_LABELS.tableSetup,
            position: MAIN_MENU_POSITION.TABLE_SETUP,
            action: () => { mainWindow.doCommand(command.ShowGameSetupMenu); },
            shownWhen: showsSetupEntries,
        },
    ];

    const mainMenu = getMainMenu();
    for (const entry of MENU_COMMANDS) mainMenu.add(entry);

    const host = createPinballYHost();
    const manageProfilesMenu = createManageProfilesMenu(host, profileStore, getDrawnMenus());
    const manageProfilesCommand = command.allocate("manageProfiles");

    // Fires when any menu opens, with a fresh item list each time. In the
    // Operator Menu, "Manage profiles" goes right after Batch Capture: this
    // Add-on's listener runs before the eXpansion Pack Settings' one (main.js
    // starts those right before Drawn Menus), which then puts a separator and
    // its own entry in between. In the Exit menu, it goes in the player group.
    mainWindow.on("menuopen", safeHandler(SCRIPT_NAME, ev => {
        const entry = { title: lang.profileReset.menuEntry, cmd: manageProfilesCommand };
        if (ev.id === "operator" && seesManageProfiles(profileStore)) {
            ev.addMenuItem({ after: command.BatchCaptureStep1 }, entry);
        }
        if (ev.id !== "exit") return;
        if (seesManageProfiles(profileStore)) addToPlayerGroup(ev, host, entry, PLAYER_GROUP_RANK.MANAGE_PROFILES);
        if (!showsSetupEntries()) {
            ev.deleteMenuItem(command.ShowOperatorMenu);
            ev.tidyMenu();
        }
    }));

    // Fires on every command.
    mainWindow.on("command", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id === manageProfilesCommand) manageProfilesMenu.open();
    }));
}
