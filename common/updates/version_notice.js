// ============================================================
// PinballY Version Notice: at init, tells a Profile that sees the setup entries
// that the PinballY Version has a gap (see pinbally_version.js), ahead of the
// Startup Screen. Once per PinballY Version for each Admin Profile, once for
// the whole cabinet while it has no Admin Profile. Never disables anything.
// - Marked once shown, so Exit counts as read; a Profile that does not see it marks nothing.
// - Its memory is in the update state file, so a Profile Reset does not bring it back.
// ============================================================

import lang from "../core/i18n.js";
import { logError } from "../core/error_log.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { pinballYVersionGap } from "../core/pinbally_version.js";
import { DIALOG_PRIORITY, getWheelDialogs } from "../core/wheel_dialog.js";
import { getStartupVeil } from "../drawing/startup_veil.js";
import { sameName } from "../profiles/profile_name_rules.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { seesSetupEntries } from "../profiles/setup_entries.js";
import { getUpdateState } from "./update_state.js";

const SCRIPT_NAME = "VersionNotice";
const MENU_ID = "versionNotice";

function isEligible(profileStore, { shownTo, shownWithoutAdmin }) {
    if (!seesSetupEntries(profileStore)) return false;
    if (!profileStore.isAdmin()) return !shownWithoutAdmin;
    const { name } = profileStore.getActiveProfile();
    return !shownTo.some(shownName => sameName(shownName, name));
}

function textOf(gap) {
    const { versionNotice: TEXT } = lang;
    return gap.kind === "tooOld"
        ? { title: TEXT.tooOldTitle, message: TEXT.tooOld(gap.minimum, gap.running) }
        : { title: TEXT.notTestedTitle, message: TEXT.notTested(gap.running, gap.tested) };
}

// dialogs: the wheel dialog queue; references: the versions compared with, the
// pack's own unless a test gives others; onShown: run as the Notice shows.
export function submitVersionNotice(host, { state, profileStore, dialogs, references, onShown = () => {} }) {
    const version = host.getPinballYVersion();
    const gap = pinballYVersionGap(version, references);
    if (gap.kind === "none") return;
    const { display } = version;
    if (!isEligible(profileStore, state.versionNotice(display))) return;

    dialogs.submit({
        id: MENU_ID,
        ...textOf(gap),
        buttons: [{ label: lang.versionNotice.gotIt }],
        priority: DIALOG_PRIORITY.VERSION_NOTICE,
        // Fires once on screen: a failed write is logged and still lets the caller's onShown run.
        onShown: () => {
            const { name } = profileStore.getActiveProfile();
            try {
                state.markVersionNoticeShown(display, name, !profileStore.hasAdminProfile());
                host.log(`[${SCRIPT_NAME}] Shown to ${name} for PinballY ${display}.`);
            } catch (error) {
                logError(SCRIPT_NAME, `ERROR remembering the Notice for PinballY ${display}, it may show again: ${error.message}`, host, error);
            }
            onShown();
        },
    });
}

export function startVersionNotice() {
    submitVersionNotice(createPinballYHost(), {
        state: getUpdateState(),
        profileStore: getProfileStore(),
        dialogs: getWheelDialogs(),
        // The Startup Screen's Loader would turn under the Notice, and swallow its Exit.
        onShown: () => getStartupVeil().hideLoader(),
    });
}
