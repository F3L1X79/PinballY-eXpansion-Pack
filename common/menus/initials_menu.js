// ============================================================
// A Profile's Initials from Manage profiles (ADR 0026): the line of a
// Profile's menu, then Name Entry in its Initials mode; OK (on nothing: clear)
// asks to confirm, counting the places the Initials would take (tables listed)
// and those former ones give back; "Yes" saves, gives back and claims, then a closing Dialog
// gives the figures. Exit and "No" change nothing. Listens to "command".
// - The line is greyed for Guest, which never has Initials.
// - A save or claim that fails is logged and shown as a one-line Dialog, writing nothing.
// ============================================================

import lang from "../core/i18n.js";
import { displayNameOf } from "../profiles/profile_name.js";
import { sameName } from "../profiles/profile_name_rules.js";
import { logHandlerError, safeHandler } from "../core/safe_handler.js";
import { createNativeMenus } from "../drawn_menu/drawn_menu.js";

const SCRIPT_NAME = "Initials";
const CONFIRM_MENU_ID = "initialsConfirm";
const OUTCOME_MENU_ID = "initialsOutcome";
const SEPARATOR = { cmd: -1 };
// The Dialog stays within the screen: past this many tables, the last line says "...".
const MAX_TABLES_LISTED = 10;
const MORE_TABLES = "...";

// nameEntry: Name Entry (common/profiles/name_entry.js); highScoreStore: the
// High Score store, whose places the Initials take; menus: what shows the
// menus; showProfileMenu(profile, lineCommand): the Profile's menu again, on that line.
export function createInitialsMenu(host, profileStore, { nameEntry, highScoreStore, showProfileMenu, menus = createNativeMenus(host) }) {
    const { profileReset: TEXT } = lang;
    const lineCommand = host.allocateCommand("initialsLine");
    const yesCommand = host.allocateCommand("initialsYes");
    const menuReturnCommand = host.getBuiltInCommand("MenuReturn");
    // The Profile whose menu offers the line, then the Initials the confirmation names.
    let offeredProfile = null;
    let pendingClaim = null;

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

    const backToProfile = profile => () => showProfileMenu(profile, lineCommand);

    // A one-line Dialog whose OK goes back to the Profile's menu.
    function showOutcome(profile, message) {
        menus.show(OUTCOME_MENU_ID, [
            { title: message, cmd: -1 },
            SEPARATOR,
            { title: TEXT.ok, cmd: menuReturnCommand, selected: true },
        ], { dialogStyle: true, onBack: backToProfile(profile) });
    }

    // The tables the Initials would take places on, one per line under the
    // question (the Dialog's dash list), by title; past MAX_TABLES_LISTED, "...".
    function tableListOf(configIds) {
        const titleOf = configId => {
            const game = host.getGameInfo(configId);
            return game && game.title ? game.title : configId;
        };
        const titles = configIds.map(titleOf).sort((a, b) => a.localeCompare(b));
        if (titles.length === 0) return "";
        const shown = titles.length > MAX_TABLES_LISTED ? [...titles.slice(0, MAX_TABLES_LISTED - 1), null] : titles;
        return `\n${shown.map(title => (title === null ? MORE_TABLES : `- ${title}`)).join("\n")}`;
    }

    // The confirmation of new Initials, or of clearing them ("" entered);
    // clearing a Profile that has none changes nothing, so it asks nothing.
    function confirm(profile, initials) {
        const former = profileStore.getInitialsOf(profile.name);
        if (initials === "" && former === null) {
            showProfileMenu(profile, lineCommand);
            return;
        }
        pendingClaim = { profile, initials };
        const name = displayNameOf(profile);
        const givenBack = former === null ? 0 : highScoreStore.previewInitialsRelease(profile.name, initials === "" ? null : initials);
        let message;
        if (initials === "") {
            message = TEXT.initialsClearConfirm(name, former, givenBack);
        } else {
            const { places, tables, configIds } = highScoreStore.previewInitialsClaim(initials);
            message = TEXT.initialsConfirm(name, initials, places, tables, former === null || former === initials ? null : givenBack)
                + tableListOf(configIds);
        }
        menus.show(CONFIRM_MENU_ID, [
            { title: message, cmd: -1 },
            SEPARATOR,
            { title: initials === "" ? TEXT.initialsClearYes : TEXT.initialsYes, cmd: yesCommand },
            { title: TEXT.no, cmd: menuReturnCommand, selected: true },
        ], {
            dialogStyle: true,
            onBack: () => {
                pendingClaim = null;
                showProfileMenu(profile, lineCommand);
            },
        });
    }

    // The Initials saved ("" clears them), then the places former ones took
    // given back and theirs claimed; a claim that fails puts the former
    // Initials back, so nothing is written.
    function saveAndClaim(profile, initials) {
        const former = profileStore.getInitialsOf(profile.name);
        if (initials === "") profileStore.clearInitials(profile.name);
        else profileStore.setInitials(profile.name, initials);
        try {
            return highScoreStore.claimInitialsPlaces(profile.name);
        } catch (error) {
            try {
                if (former === null) profileStore.clearInitials(profile.name);
                else profileStore.setInitials(profile.name, former);
            } catch (restoreError) {
                logHandlerError(SCRIPT_NAME, restoreError);
            }
            throw error;
        }
    }

    // A failure is caught here, not by safeHandler, for the player to see it;
    // its cause goes to the log. Cleared Initials go straight back to the Profile's menu.
    function saveAndReport(profile, initials) {
        const name = displayNameOf(profile);
        let message;
        try {
            const { places, tables } = saveAndClaim(profile, initials);
            if (initials === "") {
                showProfileMenu(profile, lineCommand);
                return;
            }
            message = places > 0 ? TEXT.initialsDone(name, initials, places, tables) : TEXT.initialsDoneNone(name, initials);
        } catch (error) {
            logHandlerError(SCRIPT_NAME, error);
            message = TEXT.initialsFailed(name);
        }
        showOutcome(profile, message);
    }

    function enter(profile) {
        nameEntry.openInitials({
            profileName: displayNameOf(profile),
            current: profileStore.getInitialsOf(profile.name),
            holderOf: otherHolderOf(profile),
            onDone: initials => confirm(profile, initials),
            onExit: backToProfile(profile),
        });
    }

    // Fires on every command: the line opens Name Entry for the Profile offered, "Yes" saves and claims.
    host.on("command", safeHandler(SCRIPT_NAME, ev => {
        if (ev.id === lineCommand && offeredProfile && !offeredProfile.isGuest) {
            enter(offeredProfile);
        } else if (ev.id === yesCommand && pendingClaim) {
            const { profile, initials } = pendingClaim;
            pendingClaim = null;
            saveAndReport(profile, initials);
        }
    }));

    // lineFor(profile): the menu line for this Profile ({ name, isGuest }).
    return { lineFor };
}
