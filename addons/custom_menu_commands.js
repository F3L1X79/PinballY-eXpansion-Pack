// ============================================================
// Adds "Table Setup" to the main menu through the main menu module, and
// "Manage profiles" to the Operator Menu and the Exit menu's player group.
// Listens to "menuopen" and "command".
// - With an Admin Profile, only Admins see "Table Setup", "Operator Menu" and "Manage profiles".
// - With none, "Manage profiles" offers "Become admin" to all but Guest and Child Profiles.
// - The coin door service button still opens the Operator Menu for anyone.
// - "Table Setup" gives way to an External Add-on's entry of that title, already in the menu.
// - Manage profiles' Initials line, and its Name Entry, only with the High Scores Add-on on.
// ============================================================

import { safeHandler } from "../common/core/safe_handler.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { seesSetupEntries, seesManageProfiles } from "../common/profiles/setup_entries.js";
import { getMainMenu, MAIN_MENU_POSITION } from "../common/menus/main_menu.js";
import { createManageProfilesMenu } from "../common/menus/manage_profiles_menu.js";
import { addToPlayerGroup, PLAYER_GROUP_RANK } from "../common/menus/exit_menu.js";
import { getDrawnMenus } from "../common/drawn_menu/drawn_menu.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { createNameEntry } from "../common/profiles/name_entry.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { getDrawnScreenControls } from "../common/core/drawn_screen_controls.js";
import config from "../common/core/config.js";
import lang from "../common/core/i18n.js";

const SCRIPT_NAME = "CustomMenuCommands";
// The entry the official command_example adds to the main menu: matched, never shown.
const EXTERNAL_TABLE_SETUP_TITLE = "Table setup";

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
            givesWayToTitles: [EXTERNAL_TABLE_SETUP_TITLE],
        },
    ];

    const mainMenu = getMainMenu();
    for (const entry of MENU_COMMANDS) mainMenu.add(entry);

    const host = createPinballYHost();
    // The Initials take the Default Scores bearing them, which only the High Scores Add-on reads.
    const nameEntry = config.addOns.highScores !== false
        ? createNameEntry(host, { profileStore, drawingAhead: getDrawingAhead(), drawnScreenControls: getDrawnScreenControls() })
        : null;
    const manageProfilesMenu = createManageProfilesMenu(host, profileStore, getDrawnMenus(), { nameEntry });
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
