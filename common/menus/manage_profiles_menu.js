// ============================================================
// Manage profiles, opened from the Exit menu: the list of Profiles (and
// "Every profile"), then a Profile's own menu: the mark lines (and Guest's Hidden
// line), flipping at once, the Initials line (High Scores Add-on on), the History Import's
// line, "Reset" and "Remove"; while no Profile is marked, only "Become admin". Opens
// directly through the Drawn Menu module. Listens to "command".
// - A line the mark rules forbid stays, greyed with its reason (setup_entries.js, ADR 0020).
// - Exit and Back go from a Profile's menu to the list only when drawn: natively, they close.
// - The active Profile clearing its own Admin mark closes the menus: it no longer has access.
// ============================================================

import lang from "../core/i18n.js";
import { displayNameOf } from "../profiles/profile_name.js";
import { markRefusal } from "../profiles/setup_entries.js";
import { logHandlerError, safeHandler } from "../core/safe_handler.js";
import { createNativeMenus } from "../drawn_menu/drawn_menu.js";
import { createProfileResetMenu } from "./profile_reset_menu.js";
import { createHistoryImportMenu } from "./history_import_menu.js";
import { createInitialsMenu } from "./initials_menu.js";
import { createProfileRemovalMenu } from "./profile_removal_menu.js";

const SCRIPT_NAME = "ManageProfiles";
const LIST_MENU_ID = "manageProfilesList";
const PROFILE_MENU_ID = "manageProfilesProfile";
const MARKS_FAILED_MENU_ID = "manageProfilesMarksFailed";
const BECOME_ADMIN_MENU_ID = "manageProfilesBecomeAdmin";
const SEPARATOR = { cmd: -1 };

// menus: what shows the menus (common/drawn_menu/drawn_menu.js); nameEntry:
// Name Entry (common/profiles/name_entry.js), null without the Initials line;
// highScoreStore: the High Score store, whose places the Initials take.
export function createManageProfilesMenu(host, profileStore, menus = createNativeMenus(host), { nameEntry = null, highScoreStore = null } = {}) {
    const { profileReset: TEXT } = lang;
    const profileReset = createProfileResetMenu(host, profileStore, menus);
    const historyImport = createHistoryImportMenu(host, profileStore, menus);
    const profileRemoval = createProfileRemovalMenu(host, profileStore, { menus, showList: () => openList() });
    const initials = nameEntry
        ? createInitialsMenu(host, profileStore, { nameEntry, highScoreStore, menus, showProfileMenu: (profile, cmd) => openProfile(profile, cmd) })
        : null;
    const everyProfileCommand = host.allocateCommand("manageProfilesEveryProfile");
    const adminCommand = host.allocateCommand("manageProfilesAdmin");
    const childCommand = host.allocateCommand("manageProfilesChild");
    const hiddenCommand = host.allocateCommand("manageProfilesHiddenGuest");
    const resetCommand = host.allocateCommand("manageProfilesReset");
    const becomeAdminCommand = host.allocateCommand("manageProfilesBecomeAdmin");
    const menuReturnCommand = host.getBuiltInCommand("MenuReturn");
    // One command per line of the list, by position, allocated on demand:
    // the household can grow while PinballY runs.
    const profileCommands = [];
    // The Profiles of the list on screen, and the Profile whose menu is shown.
    let listedProfiles = [];
    let shownProfile = null;

    function getProfileCommand(index) {
        while (profileCommands.length <= index) {
            profileCommands.push(host.allocateCommand(`manageProfilesProfile${profileCommands.length}`));
        }
        return profileCommands[index];
    }

    // With Guest alone, "Every profile" would only repeat its line.
    const offersEveryProfile = () => listedProfiles.length >= 2;

    // The cursor on the entry with this command (the first entry for null),
    // set on the items so that a native menu opens on it too.
    const withCursorOn = (items, selectedCmd) => items.map(item => (selectedCmd !== null && item.cmd === selectedCmd ? { ...item, selected: true } : item));

    // While the household has no Admin Profile, only "Become admin" is offered.
    function open() {
        if (profileStore.hasAdminProfile()) openList();
        else openBecomeAdmin();
    }

    function openBecomeAdmin() {
        menus.show(BECOME_ADMIN_MENU_ID, [
            { title: TEXT.becomeAdmin, cmd: becomeAdminCommand },
            SEPARATOR,
            { title: TEXT.cancel, cmd: menuReturnCommand },
        ]);
    }

    function openList(selectedCmd = null) {
        listedProfiles = profileStore.listProfiles();
        shownProfile = null;
        menus.show(LIST_MENU_ID, withCursorOn([
            { title: TEXT.listTitle, cmd: -1 },
            SEPARATOR,
            ...listedProfiles.map((profile, index) => ({ title: displayNameOf(profile), cmd: getProfileCommand(index) })),
            SEPARATOR,
            // Its own separator before Cancel; without it, the one above already sets Cancel apart.
            ...(offersEveryProfile() ? [{ title: TEXT.everyProfile, cmd: everyProfileCommand }, SEPARATOR] : []),
            { title: TEXT.cancel, cmd: menuReturnCommand },
        ], selectedCmd));
    }

    // The list again, the cursor on the Profile it was left from.
    const backToList = profile => openList(getProfileCommand(listedProfiles.findIndex(listed => listed.name === profile.name)));

    const isActive = profile => profile.name === profileStore.getActiveProfile().name;
    // The active Profile clearing its own Admin mark loses access to these menus.
    const losesAccess = (profile, marks, markName) => markName === "isAdmin" && marks.isAdmin && isActive(profile);

    // A mark line, greyed with its reason when the mark rules forbid it;
    // it stays open, the menu then shown again over itself, unless choosing
    // it takes the menus away from the active Profile.
    function markLine(profile, marks, markName, title, cmd) {
        const refusal = markRefusal(marks, markName);
        if (refusal) return { title, cmd, disabled: true, reason: TEXT.refusals[refusal] };
        return losesAccess(profile, marks, markName) ? { title, cmd } : { title, cmd, stayOpen: true };
    }

    // Guest's Hidden line, flipping like a mark line; greyed while Guest is active.
    function hiddenLine(profile) {
        const title = TEXT.hiddenLine(profileStore.isGuestHidden());
        if (isActive(profile)) return { title, cmd: hiddenCommand, disabled: true, reason: TEXT.removeRefusals.active };
        return { title, cmd: hiddenCommand, stayOpen: true };
    }

    function openProfile(profile, selectedCmd = null) {
        shownProfile = profile;
        const marks = profileStore.getMarksOf(profile.name);
        menus.show(PROFILE_MENU_ID, withCursorOn([
            { title: displayNameOf(profile), cmd: -1 },
            SEPARATOR,
            markLine(profile, marks, "isAdmin", TEXT.adminLine(marks.isAdmin), adminCommand),
            markLine(profile, marks, "isChild", TEXT.childLine(marks.isChild), childCommand),
            ...(profile.isGuest ? [hiddenLine(profile)] : []),
            ...(initials ? [initials.lineFor(profile)] : []),
            SEPARATOR,
            historyImport.lineFor(profile),
            { title: TEXT.reset, cmd: resetCommand },
            profileRemoval.lineFor(profile),
            { title: TEXT.back, cmd: menuReturnCommand },
        ], selectedCmd), { onBack: () => backToList(profile) });
    }

    // Runs a mark change or the Hidden Guest flip; a failure is caught here, not by
    // safeHandler, for the player to see it (failedText): its cause goes to the log,
    // and OK runs onBack. Returns whether the change was made.
    function tryChanging(profile, change, onBack, failedText = TEXT.marksFailed) {
        try {
            change();
            return true;
        } catch (error) {
            logHandlerError(SCRIPT_NAME, error);
            menus.show(MARKS_FAILED_MENU_ID, [
                { title: failedText(displayNameOf(profile)), cmd: -1 },
                SEPARATOR,
                { title: TEXT.ok, cmd: menuReturnCommand, selected: true },
            ], { dialogStyle: true, onBack });
            return false;
        }
    }

    // Flips the mark and shows the Profile's menu again on its line, unless
    // the active Profile just lost access to it.
    function flipMark(profile, markName, lineCommand) {
        let marks;
        const changed = tryChanging(profile, () => {
            marks = profileStore.getMarksOf(profile.name);
            profileStore.setMark(profile.name, markName, !marks[markName]);
        }, () => openProfile(profile, lineCommand));
        if (changed && !losesAccess(profile, marks, markName)) openProfile(profile, lineCommand);
    }

    // Hides or shows Guest, then shows its menu again on the Hidden line.
    function flipHiddenGuest(profile) {
        const showAgain = () => openProfile(profile, hiddenCommand);
        if (tryChanging(profile, () => profileStore.setGuestHidden(!profileStore.isGuestHidden()), showAgain, TEXT.hiddenFailed)) showAgain();
    }

    // The active Profile becomes the first Admin Profile, and gets the full list.
    function becomeAdmin() {
        const profile = profileStore.getActiveProfile();
        if (tryChanging(profile, () => profileStore.setMark(profile.name, "isAdmin", true), openBecomeAdmin)) openList();
    }

    // Fires on every command: a Profile of the list opens its menu, "Every
    // profile" and "Reset" ask to confirm the Profile Reset, a mark line flips
    // its mark, Guest's Hidden line hides or shows it, "Become admin" marks the active Profile while no other is.
    host.on("command", safeHandler(SCRIPT_NAME, ev => {
        const index = profileCommands.indexOf(ev.id);
        if (index >= 0 && index < listedProfiles.length) openProfile(listedProfiles[index]);
        else if (ev.id === becomeAdminCommand && !profileStore.hasAdminProfile()) becomeAdmin();
        else if (ev.id === everyProfileCommand && offersEveryProfile()) profileReset.confirm(listedProfiles);
        else if (ev.id === adminCommand && shownProfile) flipMark(shownProfile, "isAdmin", adminCommand);
        else if (ev.id === childCommand && shownProfile) flipMark(shownProfile, "isChild", childCommand);
        else if (ev.id === hiddenCommand && shownProfile && shownProfile.isGuest && !isActive(shownProfile)) flipHiddenGuest(shownProfile);
        else if (ev.id === resetCommand && shownProfile) profileReset.confirm([shownProfile]);
    }));

    return { open };
}
