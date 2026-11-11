// ============================================================
// Menu Cleanup (off by default): removes Help, About, Information, Flyer,
// High Scores, Instruction Card and some filter submenus from PinballY's
// native menus, for every Profile. Listens to "menuopen" and "settingsreload".
// - Filter by System goes only when the configured tables use at most one System.
// - Leaves no doubled, leading or trailing separator.
// - PinballY's dedicated buttons still open those screens.
// ============================================================

import { safeHandler } from "../common/core/safe_handler.js";
import { isSeparator } from "../common/menus/menu_separator.js";

const SCRIPT_NAME = "MenuCleanup";

// PinballY's built-in commands removed from each menu, by menu id.
const REMOVED_COMMANDS = {
    exit: ["Help", "AboutBox"],
    operator: ["Help", "AboutBox"],
    main: ["GameInfo", "Flyer", "HighScores", "Instructions", "FilterBySystem", "FilterByRecency", "FilterByAdded"],
};

// Systems told apart by displayName: GameSysInfo documents no id.
function countConfiguredSystems() {
    const names = new Set();
    for (const game of gameList.getAllGames()) {
        if (game.isConfigured === false || !game.system) continue;
        names.add(game.system.displayName);
    }
    return names.size;
}

export default function init() {
    // Counted at the first main menu opening, then again after the game
    // list may have changed, not on every opening.
    let systemCount = null;

    // Fires when PinballY reloads its settings, which reloads the game list.
    optionSettings.on("settingsreload", safeHandler(SCRIPT_NAME, () => {
        systemCount = null;
    }));

    // Fires when any menu opens, with a fresh item list each time.
    mainWindow.on("menuopen", safeHandler(SCRIPT_NAME, ev => {
        let removed = REMOVED_COMMANDS[ev.id];
        if (!removed) return;
        if (ev.id === "main") {
            if (systemCount === null) systemCount = countConfiguredSystems();
            if (systemCount > 1) removed = removed.filter(name => name !== "FilterBySystem");
        }
        const removedCmds = removed.map(name => command[name]);
        const items = [];
        for (const item of ev.items) {
            if (removedCmds.includes(item.cmd)) continue;
            if (isSeparator(item) && (items.length === 0 || isSeparator(items[items.length - 1]))) continue;
            items.push(item);
        }
        if (items.length > 0 && isSeparator(items[items.length - 1])) items.pop();
        ev.items = items;
        ev.menuUpdated = true;
    }));
}
