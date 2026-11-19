// ============================================================
// Conflict Notice: the pack's listeners report a Conflict they saw happen; each
// report is one Info Log line, and a Dialog for a Profile that sees the Setup
// Entries, through the wheel dialog module, so it waits for the wheel. Asked
// until answered, then never again. "Turn off" saves the pack's Add-on off, then
// "Restart now / Later". At startup, it also says if Scripts\main.js's pack line is not last.
// - Exit counts as "Keep both"; attract mode closing it, or a failed "Turn off" save, is no answer.
// - One submission per Conflict at a time; stale once the active Profile stops being eligible.
// - Answers are in the update state file: per cabinet, kept through a Profile Reset and a Pack Update.
// ============================================================

import lang from "../core/i18n.js";
import { logError } from "../core/error_log.js";
import { logInfo } from "../core/info_log.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { safeHandler } from "../core/safe_handler.js";
import { findLaunchScriptCandidates } from "./launch_script_candidates.js";
import { DIALOG_PRIORITY, getPackMenusForDialogs, getWheelDialogs } from "../core/wheel_dialog.js";
import { createSaveAndRestart } from "../settings/save_and_restart.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { seesSetupEntries } from "../profiles/setup_entries.js";
import { getUpdateState } from "../updates/update_state.js";

const SCRIPT_NAME = "ConflictNotice";
const MENU_ID = "conflictNotice";
// The answers, persisted.
const KEEP_BOTH = "keepBoth";
const TURN_OFF = "turnOff";
const SHOWN = "shown";

// The Conflicts the pack can see happen; the values are persisted.
export const CONFLICT = Object.freeze({ LAUNCH_SCREEN: "launchScreen" });
// Not a Conflict, but asked and remembered the same way; persisted beside them.
const IMPORT_ORDER = "importOrder";

// What the Info Log says the pack saw, per Conflict.
const SEEN = Object.freeze({
    [CONFLICT.LAUNCH_SCREEN]: "\"launchoverlayshow\" reached the Launch overlay already cancelled by another script",
});

// Which Dialog each Notice is: "Turn off" or "Keep both", or one button that only tells.
const DIALOG_KIND = Object.freeze({ [CONFLICT.LAUNCH_SCREEN]: "choice", [IMPORT_ORDER]: "acknowledgement" });

// A line whose first non-blank characters are "//".
const isCommentedOut = line => /^\s*\/\//.test(line);
const isDynamicImport = line => /\bimport\s*\(/.test(line);
const withoutBlockComments = text => text.replace(/\/\*[\s\S]*?\*\//g, "");
const withoutTrailingSlashes = path => path.replace(/\\+$/, "");
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The pack's Add-on each Conflict's "Turn off" saves off (config.addOns key).
const ADD_ON = Object.freeze({ [CONFLICT.LAUNCH_SCREEN]: "seamlessLaunchOverlay" });

// What finds the files that probably caused each Conflict, by name.
const CANDIDATES = Object.freeze({ [CONFLICT.LAUNCH_SCREEN]: findLaunchScriptCandidates });

// saveAndRestart: the settings' save and restart step (common/settings/save_and_restart.js).
export function createConflictNotice(host, { state, profileStore, dialogs, saveAndRestart }) {
    // Conflict id to its submission, queued or on screen; absent once answered or found stale.
    const waiting = new Map();
    // Reported this session and not answered yet.
    const unanswered = new Set();
    // Attract mode starts so far, and their count when a Notice last showed.
    let attractStarts = 0;
    let attractStartsWhenShown = 0;

    const isAnswered = conflictId => state.conflictAnswer(conflictId) !== null;
    const isEligible = conflictId => seesSetupEntries(profileStore) && !isAnswered(conflictId);

    function remember(conflictId, answer) {
        unanswered.delete(conflictId);
        try {
            state.rememberConflictAnswer(conflictId, answer);
            host.log(`[${SCRIPT_NAME}] "${conflictId}" answered "${answer}".`);
        } catch (error) {
            logError(SCRIPT_NAME, `ERROR remembering the answer to "${conflictId}", it may be asked again: ${error.message}`, host, error);
        }
    }

    // Remembered once saved; a failed save remembers nothing and asks again
    // after "Setting not saved". Later leaves the wheel as it was.
    function turnOff(conflictId) {
        saveAndRestart.saveAddOn(ADD_ON[conflictId], false, {
            onSaved: () => {
                remember(conflictId, TURN_OFF);
                saveAndRestart.askRestart(() => {});
            },
            reopen: () => submit(conflictId),
        });
    }

    // The files that probably caused it, read when the Notice is submitted.
    function candidatesOf(conflictId) {
        return CANDIDATES[conflictId](host, (folder, error) => {
            logError(SCRIPT_NAME, `ERROR reading ${folder}, skipped in the Notice's probable scripts: ${error.message}`, host, error);
        });
    }

    // The runtime Conflict's Dialog: "Turn off" or "Keep both", answered when closed.
    function choiceDialog(conflictId) {
        let turnedOff = false;
        const addOnName = lang.expansionPackSettings.addOns[ADD_ON[conflictId]].name;
        const candidates = candidatesOf(conflictId);
        return {
            message: candidates.length === 0
                ? lang.conflictNotice[conflictId].message
                : `${lang.conflictNotice[conflictId].message} ${lang.conflictNotice.probably(candidates)}`,
            buttons: [
                {
                    label: lang.conflictNotice.turnOff(addOnName),
                    action: () => {
                        turnedOff = true;
                        turnOff(conflictId);
                    },
                },
                { label: lang.conflictNotice.keepBoth, selected: true },
            ],
            onShown: () => { attractStartsWhenShown = attractStarts; },
            // Fires for the buttons and Exit, but also when attract mode closes
            // it, maybe before "attractmodestart" reaches this module: decided
            // one tick later, once every listener of that event has run.
            // "Turn off" has already run and remembers its own answer.
            onClosed: () => {
                if (turnedOff) return;
                host.setTimeout(safeHandler(SCRIPT_NAME, () => {
                    if (attractStarts === attractStartsWhenShown) remember(conflictId, KEEP_BOTH);
                }), 0);
            },
        };
    }

    // A Notice that only tells: one button, remembered once shown.
    function acknowledgementDialog(conflictId) {
        return {
            message: lang.conflictNotice[conflictId].message,
            buttons: [{ label: lang.conflictNotice.gotIt }],
            onShown: () => remember(conflictId, SHOWN),
            onClosed: () => {},
        };
    }

    const DIALOGS = { choice: choiceDialog, acknowledgement: acknowledgementDialog };

    // conflictId: one of CONFLICT, or IMPORT_ORDER.
    function submit(conflictId) {
        if (waiting.has(conflictId) || !isEligible(conflictId)) return;
        const submission = {};
        let onScreen = false;
        waiting.set(conflictId, submission);
        const { message, buttons, onShown, onClosed } = DIALOGS[DIALOG_KIND[conflictId]](conflictId);
        dialogs.submit({
            id: MENU_ID,
            title: lang.conflictNotice[conflictId].title,
            message,
            buttons,
            priority: DIALOG_PRIORITY.CONFLICT_NOTICE,
            // Final once true: the queue also asks away from its turn (isIdle) and
            // keeps the dialog, which must not come back beside a newer submission.
            isStale: () => {
                if (!onScreen && waiting.get(conflictId) === submission && !isEligible(conflictId)) waiting.delete(conflictId);
                return waiting.get(conflictId) !== submission;
            },
            onShown: () => {
                onScreen = true;
                onShown();
            },
            onClosed: () => {
                waiting.delete(conflictId);
                onClosed();
            },
        });
    }

    // Some line after the pack's own in Scripts\main.js is a dynamic import(
    // (static imports always run before the pack); null when that cannot be told.
    // Commented-out imports never count, to raise no false alarm.
    function hasImportAfterPackLine() {
        const path = `${withoutTrailingSlashes(host.getProgramFolder())}\\Scripts\\main.js`;
        let lines;
        try {
            lines = withoutBlockComments(host.files.readText(path)).split(/\r?\n/).filter(line => !isCommentedOut(line));
        } catch (error) {
            logInfo(SCRIPT_NAME, `Import order not checked, ${path} unreadable: ${error.message}`, host);
            return null;
        }
        const packFolderName = withoutTrailingSlashes(host.getProjectFolder()).split("\\").pop();
        const packImport = new RegExp(`[/\\\\]${escapeRegExp(packFolderName)}[/\\\\]main\\.js`, "i");
        const packLine = lines.findIndex(line => isDynamicImport(line) && packImport.test(line));
        if (packLine === -1) {
            logInfo(SCRIPT_NAME, `Import order not checked, no import( of ${packFolderName}/main.js in ${path}.`, host);
            return null;
        }
        return lines.slice(packLine + 1).some(isDynamicImport);
    }

    // Fires when the cabinet sits idle: it closes any menu on screen.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, () => { attractStarts++; }));

    // Fires after each Profile switch: whoever is eligible now gets what is still unanswered.
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => {
        for (const conflictId of unanswered) submit(conflictId);
    }));

    // conflictId: one of CONFLICT, each time the pack sees it happen.
    function report(conflictId) {
        logInfo(SCRIPT_NAME, `Conflict "${conflictId}": ${SEEN[conflictId]}.`, host);
        if (isAnswered(conflictId)) return;
        unanswered.add(conflictId);
        submit(conflictId);
    }

    return {
        report,
        // At startup: asks once for the cabinet to move the pack's line last.
        checkImportOrder() {
            if (!hasImportAfterPackLine()) return;
            logInfo(SCRIPT_NAME, "Import order: Scripts\\main.js has another import( line after the pack's.", host);
            if (isAnswered(IMPORT_ORDER)) return;
            unanswered.add(IMPORT_ORDER);
            submit(IMPORT_ORDER);
        },
    };
}

let sharedConflictNotice = null;

export function getConflictNotice() {
    if (!sharedConflictNotice) {
        const host = createPinballYHost();
        const profileStore = getProfileStore();
        sharedConflictNotice = createConflictNotice(host, {
            state: getUpdateState(),
            profileStore,
            dialogs: getWheelDialogs(),
            saveAndRestart: createSaveAndRestart(host, getPackMenusForDialogs, { scriptName: SCRIPT_NAME, idPrefix: MENU_ID }),
        });
    }
    return sharedConflictNotice;
}
