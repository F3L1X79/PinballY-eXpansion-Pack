// ============================================================
// Profile Removal menus, opened from Manage profiles: the line of a Profile's
// menu, one confirmation on "No", then a one-line outcome whose OK shows the
// list of Profiles again. Opens directly through the Drawn Menu module.
// Listens to "command".
// - The line is greyed with its reason for Guest and the active Profile.
// ============================================================

import lang from "../core/i18n.js";
import { displayNameOf } from "../profiles/profile_name.js";
import { logHandlerError, safeHandler } from "../core/safe_handler.js";
import { createNativeMenus } from "../drawn_menu/drawn_menu.js";

const SCRIPT_NAME = "ProfileRemoval";
const CONFIRM_MENU_ID = "profileRemovalConfirm";
const OUTCOME_MENU_ID = "profileRemovalOutcome";
const SEPARATOR = { cmd: -1 };

// menus: what shows the menus (common/drawn_menu/drawn_menu.js);
// showList(): shows the list of Profiles again, after the outcome.
export function createProfileRemovalMenu(host, profileStore, { menus = createNativeMenus(host), showList }) {
    const { profileReset: TEXT } = lang;
    const lineCommand = host.allocateCommand("profileRemovalLine");
    const yesCommand = host.allocateCommand("profileRemovalYes");
    const cancelCommand = host.getBuiltInCommand("MenuReturn");
    // The Profile whose menu offers the line, then the one the confirmation names.
    let offeredProfile = null;
    let profileToRemove = null;

    function refusalOf(profile) {
        if (profile.isGuest) return TEXT.removeRefusals.guest;
        if (profile.name === profileStore.getActiveProfile().name) return TEXT.removeRefusals.active;
        return null;
    }

    // The line of the Profile's menu, greyed with its reason when refused;
    // the line's command then acts on this Profile.
    function lineFor(profile) {
        offeredProfile = profile;
        const reason = refusalOf(profile);
        return reason ? { title: TEXT.remove, cmd: lineCommand, disabled: true, reason } : { title: TEXT.remove, cmd: lineCommand };
    }

    function confirm(profile) {
        profileToRemove = profile;
        menus.show(CONFIRM_MENU_ID, [
            { title: TEXT.removeConfirm(displayNameOf(profile)), cmd: -1 },
            SEPARATOR,
            { title: TEXT.removeYes, cmd: yesCommand },
            { title: TEXT.no, cmd: cancelCommand, selected: true },
        ], { dialogStyle: true });
    }

    // Removes, then shows the outcome: a failure is caught here, not by
    // safeHandler, for the player to see it; its cause goes to the log.
    function removeAndReport(profile) {
        let message;
        try {
            profileStore.removeProfile(profile.name);
            message = TEXT.removeDone(displayNameOf(profile));
        } catch (error) {
            logHandlerError(SCRIPT_NAME, error);
            message = TEXT.removeFailed(displayNameOf(profile));
        }
        menus.show(OUTCOME_MENU_ID, [
            { title: message, cmd: -1 },
            SEPARATOR,
            { title: TEXT.ok, cmd: cancelCommand, selected: true },
        ], { dialogStyle: true, onBack: showList });
    }

    // Fires on every command: the line asks to confirm, "Yes" removes the
    // Profile and shows the outcome.
    host.on("command", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id === lineCommand && offeredProfile && !refusalOf(offeredProfile)) confirm(offeredProfile);
        else if (ev.id === yesCommand && profileToRemove) {
            const profile = profileToRemove;
            profileToRemove = null;
            removeAndReport(profile);
        }
    }));

    // lineFor(profile): the "Remove" line of that Profile's menu.
    return { lineFor };
}
