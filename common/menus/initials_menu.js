// ============================================================
// A Profile's Initials from Manage profiles (ADR 0026): the line of a
// Profile's menu, then Name Entry in its Initials mode; OK saves them (clears
// them when empty), Exit changes nothing, and the Profile's menu shows again.
// Listens to "command".
// - The line is greyed for Guest, which never has Initials.
// - A save that fails is logged and shown as a one-line Dialog, writing nothing.
// ============================================================

import lang from "../core/i18n.js";
import { displayNameOf } from "../profiles/profile_name.js";
import { sameName } from "../profiles/profile_name_rules.js";
import { logHandlerError, safeHandler } from "../core/safe_handler.js";
import { createNativeMenus } from "../drawn_menu/drawn_menu.js";

const SCRIPT_NAME = "Initials";
const FAILED_MENU_ID = "initialsFailed";
const SEPARATOR = { cmd: -1 };

// nameEntry: Name Entry (common/profiles/name_entry.js); menus: what shows
// the menus; showProfileMenu(profile, lineCommand): the Profile's menu again, on that line.
export function createInitialsMenu(host, profileStore, { nameEntry, showProfileMenu, menus = createNativeMenus(host) }) {
    const { profileReset: TEXT } = lang;
    const lineCommand = host.allocateCommand("initialsLine");
    const okCommand = host.getBuiltInCommand("MenuReturn");
    // The Profile whose menu offers the line.
    let offeredProfile = null;

    // The line of the Profile's menu, showing its Initials; greyed for Guest.
    function lineFor(profile) {
        offeredProfile = profile;
        const title = TEXT.initialsLine(profile.isGuest ? null : profileStore.getInitialsOf(profile.name));
        return profile.isGuest ? { title, cmd: lineCommand, disabled: true, reason: TEXT.initialsRefusals.guest } : { title, cmd: lineCommand };
    }

    // Another Profile than this one holding the Initials; never Guest, so its folder name is the name shown.
    function otherHolderOf(profile) {
        return initials => {
            const holder = profileStore.findInitialsHolder(initials);
            return holder === null || sameName(holder, profile.name) ? null : holder;
        };
    }

    // A failure is caught here, not by safeHandler, for the player to see it; its cause goes to the log.
    function save(profile, initials) {
        try {
            if (initials === "") profileStore.clearInitials(profile.name);
            else profileStore.setInitials(profile.name, initials);
        } catch (error) {
            logHandlerError(SCRIPT_NAME, error);
            menus.show(FAILED_MENU_ID, [
                { title: TEXT.initialsFailed(displayNameOf(profile)), cmd: -1 },
                SEPARATOR,
                { title: TEXT.ok, cmd: okCommand, selected: true },
            ], { dialogStyle: true, onBack: () => showProfileMenu(profile, lineCommand) });
            return;
        }
        showProfileMenu(profile, lineCommand);
    }

    function enter(profile) {
        nameEntry.openInitials({
            profileName: displayNameOf(profile),
            current: profileStore.getInitialsOf(profile.name),
            holderOf: otherHolderOf(profile),
            onDone: initials => save(profile, initials),
            onExit: () => showProfileMenu(profile, lineCommand),
        });
    }

    // Fires on every command: the line opens Name Entry for the Profile offered.
    host.on("command", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id === lineCommand && offeredProfile && !offeredProfile.isGuest) enter(offeredProfile);
    }));

    // lineFor(profile): the menu line for this Profile ({ name, isGuest }).
    return { lineFor };
}
