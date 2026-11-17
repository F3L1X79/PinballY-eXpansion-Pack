// ============================================================
// Conflict Notice: the pack's listeners report a Conflict they saw happen; each
// report is one Info Log line, and a Dialog for a Profile that sees the Setup
// Entries, through the wheel dialog module, so it waits for the wheel, naming
// the known files that probably caused it. Asked until answered, then never
// again. "Turn off" saves the pack's Add-on off, then "Restart now / Later".
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

// The Conflicts the pack can see happen; the values are persisted.
export const CONFLICT = Object.freeze({ LAUNCH_SCREEN: "launchScreen" });

// What the Info Log says the pack saw, per Conflict.
const SEEN = Object.freeze({
    [CONFLICT.LAUNCH_SCREEN]: "\"launchoverlayshow\" reached the Launch overlay already cancelled by another script",
});

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

    // The files that probably caused it, read when the Notice is submitted;
    // none when the Scripts folder cannot be read.
    function candidatesOf(conflictId) {
        const find = CANDIDATES[conflictId];
        try {
            return find(host);
        } catch (error) {
            logError(SCRIPT_NAME, `ERROR reading the Scripts folder, the Notice names no script: ${error.message}`, host, error);
            return [];
        }
    }

    function submit(conflictId) {
        if (waiting.has(conflictId) || !isEligible(conflictId)) return;
        const submission = {};
        let onScreen = false;
        let turnedOff = false;
        waiting.set(conflictId, submission);
        const addOnName = lang.expansionPackSettings.addOns[ADD_ON[conflictId]].name;
        const candidates = candidatesOf(conflictId);
        dialogs.submit({
            id: MENU_ID,
            title: lang.conflictNotice[conflictId].title,
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
            priority: DIALOG_PRIORITY.CONFLICT_NOTICE,
            // Final once true: the queue also asks away from its turn (isIdle) and
            // keeps the dialog, which must not come back beside a newer submission.
            isStale: () => {
                if (!onScreen && waiting.get(conflictId) === submission && !isEligible(conflictId)) waiting.delete(conflictId);
                return waiting.get(conflictId) !== submission;
            },
            onShown: () => {
                onScreen = true;
                attractStartsWhenShown = attractStarts;
            },
            // Fires for the buttons and Exit, but also when attract mode closes
            // it, maybe before "attractmodestart" reaches this module: decided
            // one tick later, once every listener of that event has run.
            // "Turn off" has already run and remembers its own answer.
            onClosed: () => {
                waiting.delete(conflictId);
                if (turnedOff) return;
                host.setTimeout(safeHandler(SCRIPT_NAME, () => {
                    if (attractStarts === attractStartsWhenShown) remember(conflictId, KEEP_BOTH);
                }), 0);
            },
        });
    }

    // Fires when the cabinet sits idle: it closes any menu on screen.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, () => { attractStarts++; }));

    // Fires after each Profile switch: whoever is eligible now gets what is still unanswered.
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => {
        for (const conflictId of unanswered) submit(conflictId);
    }));

    return {
        // conflictId: one of CONFLICT, each time the pack sees it happen.
        report(conflictId) {
            logInfo(SCRIPT_NAME, `Conflict "${conflictId}": ${SEEN[conflictId]}.`, host);
            if (isAnswered(conflictId)) return;
            unanswered.add(conflictId);
            submit(conflictId);
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
            saveAndRestart: createSaveAndRestart(host, profileStore, getPackMenusForDialogs, { scriptName: SCRIPT_NAME, idPrefix: MENU_ID }),
        });
    }
    return sharedConflictNotice;
}
