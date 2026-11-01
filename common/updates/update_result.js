// ============================================================
// Update result: at init, a Pack Update an earlier start asked for says how
// it went. The requested Pack Version running shows "eXpansion Pack updated
// to vX.Y.Z" once, ahead of the Update Prompt, with the Release Highlights
// of the versions on the way below it; any other version brings an
// Error Toast pointing to the helper's log (docs/adr/0018).
// - Shown whatever the check setting: a failed update is never silent.
// - The failure is for whoever sees the setup entries: kept until its toast starts, submitted again at each Profile switch.
// ============================================================

import lang from "../core/i18n.js";
import { createPinballYHost, PACK_UPDATE_LOG_HINT } from "../core/pinbally_host.js";
import { safeHandler } from "../core/safe_handler.js";
import { logError } from "../core/error_log.js";
import { PACK_VERSION } from "../core/pack_version.js";
import { DIALOG_PRIORITY, getWheelDialogs } from "../core/wheel_dialog.js";
import { getAchievementToasts, TOAST_KIND } from "../achievements/achievement_toast.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { seesSetupEntries } from "../profiles/setup_entries.js";
import { getUpdateState } from "./update_state.js";
import { selectReleaseHighlights } from "./release_highlights.js";
import { getStartupVeil } from "../drawing/startup_veil.js";

const SCRIPT_NAME = "UpdateResult";
const UPDATED_MENU_ID = "packUpdated";

// dialogs: the wheel dialog queue; toasts: the Achievement Toast queue;
// onShown: run as the success message shows; releaseHighlights: the
// translated group, keyed by Pack Version.
export function submitUpdateResult(host, { state, profileStore, dialogs, toasts, onShown = () => {}, releaseHighlights = lang.releaseHighlights }) {
    const { packUpdates: TEXT } = lang;
    const requested = state.requestedVersion();
    if (!requested) return;
    if (requested === PACK_VERSION) {
        host.log(`[${SCRIPT_NAME}] Pack Update to ${requested} done.`);
        const highlights = selectReleaseHighlights({ previousVersion: state.previousVersion(), runningVersion: PACK_VERSION, releaseHighlights });
        dialogs.submit({
            id: UPDATED_MENU_ID,
            title: TEXT.updatedTitle,
            message: highlights.length
                ? `${TEXT.updated(requested)}\n\n${highlights.map(sentence => `- ${sentence}`).join("\n")}`
                : TEXT.updated(requested),
            buttons: [{ label: TEXT.ok }],
            priority: DIALOG_PRIORITY.UPDATE_RESULT,
            onShown: () => {
                state.forgetRequest();
                onShown();
            },
        });
        return;
    }

    logError(SCRIPT_NAME, `ERROR Pack Update to ${requested} failed, still on ${PACK_VERSION}: see ${PACK_UPDATE_LOG_HINT}`, host);
    // Each submit replaces the one before: the queue only checks a toast at
    // its turn, so a toast still waiting may never get one without a new submit.
    let latestSubmit = 0;
    function submitToast() {
        const submitNumber = ++latestSubmit;
        toasts.submit({
            kind: TOAST_KIND.ERROR,
            title: TEXT.toastTitle,
            description: lang.errorToast.packUpdateFailed(requested, PACK_UPDATE_LOG_HINT),
            onShown: () => state.forgetRequest(),
            // Decided at its turn, once the Startup Screen's pick is made.
            isStale: () => submitNumber !== latestSubmit || !state.requestedVersion() || !seesSetupEntries(profileStore),
        });
    }
    submitToast();
    // Fires after each Profile switch, the Startup Screen's pick included.
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => {
        if (state.requestedVersion() && seesSetupEntries(profileStore)) submitToast();
    }));
}

export function startUpdateResult() {
    submitUpdateResult(createPinballYHost(), {
        state: getUpdateState(),
        profileStore: getProfileStore(),
        dialogs: getWheelDialogs(),
        toasts: getAchievementToasts(),
        // The Startup Screen's Loader would turn under the message, and swallow its Exit.
        onShown: () => getStartupVeil().hideLoader(),
    });
}
