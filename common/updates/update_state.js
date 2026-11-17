// ============================================================
// Update state: the small git-ignored JSON file in the pack folder that
// remembers the newest known release, the version last offered, the one an
// update in progress installs with the one it replaces (docs/adr/0018), who
// saw the PinballY Version Notice, and the Conflict Notices' answers.
// Read once when created; each change writes the whole file.
// - An unreadable file (cut by a crash) is logged, deleted, and read as empty.
// ============================================================

import { createPinballYHost } from "../core/pinbally_host.js";
import { logError } from "../core/error_log.js";

const SCRIPT_NAME = "UpdateCheck";
export const UPDATE_STATE_FILE_NAME = "pack_update.json";
const FORMAT_VERSION = 1;
const NOTICE_NOT_SHOWN = Object.freeze({ shownTo: [], shownWithoutAdmin: false });

export function createUpdateState(host) {
    const path = `${host.getProjectFolder()}\\${UPDATE_STATE_FILE_NAME}`;

    function load() {
        if (!host.files.fileExists(path)) return null;
        try {
            const saved = JSON.parse(host.files.readText(path));
            if (!saved || typeof saved !== "object") throw new Error("not a JSON object");
            return saved;
        } catch (error) {
            logError(SCRIPT_NAME, `ERROR reading ${UPDATE_STATE_FILE_NAME}, deleted: ${error.message}`, host, error);
            host.files.deleteFile(path);
            return null;
        }
    }

    // null while nothing was ever saved: no file is written for nothing.
    let saved = load();

    function save(next) {
        saved = { ...next, version: FORMAT_VERSION };
        host.files.writeText(path, JSON.stringify(saved));
    }

    // { shownTo: Profile names, shownWithoutAdmin } for this PinballY Version's
    // display string; the record of another version counts for nothing.
    function versionNotice(pinballYVersion) {
        const record = saved && saved.versionNotice;
        return record && record.pinballYVersion === pinballYVersion ? record : NOTICE_NOT_SHOWN;
    }

    return {
        versionNotice,
        // A different version replaces the whole record.
        markVersionNoticeShown: (pinballYVersion, profileName, withoutAdmin) => {
            const { shownTo, shownWithoutAdmin } = versionNotice(pinballYVersion);
            save({
                ...saved,
                versionNotice: { pinballYVersion, shownTo: [...shownTo, profileName], shownWithoutAdmin: shownWithoutAdmin || withoutAdmin },
            });
        },
        // The answer given to a Conflict Notice ("keepBoth"), or null.
        conflictAnswer: conflictId => (saved && saved.conflictAnswers && saved.conflictAnswers[conflictId]) || null,
        rememberConflictAnswer: (conflictId, answer) => save({
            ...saved,
            conflictAnswers: { ...(saved && saved.conflictAnswers), [conflictId]: answer },
        }),
        // { packVersion, zipUrl, sha256 }, or null.
        latestRelease: () => (saved && saved.latestRelease) || null,
        rememberRelease: ({ packVersion, zipUrl, sha256 }) => save({ ...saved, latestRelease: { packVersion, zipUrl, sha256 } }),
        forgetRelease: () => {
            if (!saved || !saved.latestRelease) return;
            const { latestRelease, ...rest } = saved;
            save(rest);
        },
        // The Pack Version the Update Prompt last asked about, or null.
        offeredVersion: () => (saved && saved.offeredVersion) || null,
        markOffered: packVersion => save({ ...saved, offeredVersion: packVersion }),
        // The Pack Version a Pack Update in progress installs, or null.
        requestedVersion: () => (saved && saved.requestedVersion) || null,
        // The Pack Version running when that update was asked, or null (asked by an older pack).
        previousVersion: () => (saved && saved.previousVersion) || null,
        requestUpdate: (packVersion, previousVersion) => save({ ...saved, requestedVersion: packVersion, previousVersion }),
        forgetRequest: () => {
            if (!saved || !saved.requestedVersion) return;
            const { requestedVersion, previousVersion, ...rest } = saved;
            save(rest);
        },
    };
}

let sharedUpdateState = null;

export function getUpdateState() {
    if (!sharedUpdateState) sharedUpdateState = createUpdateState(createPinballYHost());
    return sharedUpdateState;
}
