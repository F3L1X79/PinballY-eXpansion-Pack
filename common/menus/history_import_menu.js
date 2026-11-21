// ============================================================
// History Import menus, opened from Manage profiles: the line of a
// Profile's menu, one confirmation on "No" naming what would be added, then
// a one-line outcome (ADR 0025). Opens directly through the Drawn Menu
// module. Listens to "command".
// - The line is greyed with its reason: done (naming who), Guest, nothing left.
// - The import keeps the Collection Tier its totals reach, for no Play to announce it.
// ============================================================

import lang from "../core/i18n.js";
import { displayNameOf } from "../profiles/profile_name.js";
import { logHandlerError, safeHandler } from "../core/safe_handler.js";
import { createNativeMenus } from "../drawn_menu/drawn_menu.js";
import { collectionMasteryOfProfile } from "../mastery/table_mastery.js";
import { tablesVisibleTo } from "../tables/visible_tables.js";

const SCRIPT_NAME = "HistoryImport";
const CONFIRM_MENU_ID = "historyImportConfirm";
const OUTCOME_MENU_ID = "historyImportOutcome";
const SEPARATOR = { cmd: -1 };

// Rounded up: a few minutes taken over never read as "hours: 0".
const hoursOf = seconds => Math.ceil(seconds / 3600);

// menus: what shows the menus (common/drawn_menu/drawn_menu.js).
export function createHistoryImportMenu(host, profileStore, menus = createNativeMenus(host)) {
    const { profileReset: TEXT } = lang;
    const lineCommand = host.allocateCommand("historyImportLine");
    const yesCommand = host.allocateCommand("historyImportYes");
    const cancelCommand = host.getBuiltInCommand("MenuReturn");
    // The Profile whose menu offers the line, then the one the confirmation names.
    let offeredProfile = null;
    let profileToImport = null;

    // Why the History Import is refused to this Profile, null when it is offered.
    function refusalOf(profile) {
        // Never Guest, so its folder name is the name shown.
        const importer = profileStore.getHistoryImportProfile();
        if (importer) return TEXT.historyRefusals.done(importer);
        if (profile.isGuest) return TEXT.historyRefusals.guest;
        if (profileStore.previewHistoryImport(profile.name, host.getAllTables()).tableCount === 0) return TEXT.historyRefusals.nothingLeft;
        return null;
    }

    // The line of the Profile's menu, greyed with its reason when refused;
    // the line's command then acts on this Profile.
    function lineFor(profile) {
        offeredProfile = profile;
        const reason = refusalOf(profile);
        return reason ? { title: TEXT.historyLine, cmd: lineCommand, disabled: true, reason } : { title: TEXT.historyLine, cmd: lineCommand };
    }

    function confirm(profile) {
        profileToImport = profile;
        const { tableCount, games, seconds } = profileStore.previewHistoryImport(profile.name, host.getAllTables());
        menus.show(CONFIRM_MENU_ID, [
            { title: TEXT.historyConfirm(displayNameOf(profile), games, hoursOf(seconds), tableCount), cmd: -1 },
            SEPARATOR,
            { title: TEXT.historyYes, cmd: yesCommand },
            { title: TEXT.no, cmd: cancelCommand, selected: true },
        ], { dialogStyle: true });
    }

    // Imports, then shows the outcome: a failure is caught here, not by
    // safeHandler, for the player to see it; its cause goes to the log.
    function importAndReport(profile) {
        let message;
        try {
            const { tableCount, games, seconds } = profileStore.importHistory(profile.name, host.getAllTables(), {
                collectionTierOf: data => collectionMasteryOfProfile(tablesVisibleTo(host.getVisibleTables(), profileStore, profile.name), data).tier,
            });
            message = TEXT.historyDone(displayNameOf(profile), games, hoursOf(seconds), tableCount);
        } catch (error) {
            logHandlerError(SCRIPT_NAME, error);
            message = TEXT.historyFailed(displayNameOf(profile));
        }
        menus.show(OUTCOME_MENU_ID, [
            { title: message, cmd: -1 },
            SEPARATOR,
            { title: TEXT.ok, cmd: cancelCommand, selected: true },
        ], { dialogStyle: true });
    }

    // Fires on every command: the line asks to confirm, "Yes" imports and shows the outcome.
    host.on("command", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id === lineCommand && offeredProfile && !refusalOf(offeredProfile)) {
            confirm(offeredProfile);
        } else if (ev.id === yesCommand && profileToImport) {
            const profile = profileToImport;
            profileToImport = null;
            importAndReport(profile);
        }
    }));

    // lineFor(profile): the menu line for this Profile ({ name, isGuest }).
    return { lineFor };
}
