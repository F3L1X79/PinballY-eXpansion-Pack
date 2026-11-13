// ============================================================
// The pack's dated log files in the pack folder (the Error Log's errors.log,
// the Info Log's info.log): each entry dated with the Pack Version. Once per
// start, a file over 1 MB becomes its ".old.log" before the start's first entry.
// - Never throws: a failure is one line per file and session, through the caller's report.
// ============================================================

import { PACK_VERSION } from "./pack_version.js";

export const ERROR_LOG_FILE = { name: "errors.log", oldName: "errors.old.log", scriptName: "ErrorLog" };
export const INFO_LOG_FILE = { name: "info.log", oldName: "info.old.log", scriptName: "InfoLog" };

const ROTATION_SIZE_BYTES = 1024 * 1024;
const CONTINUATION_INDENT = "    ";

// By file path: whichever host instance writes first rotates the file and
// reports a failure, once for the whole session.
const sessionStates = new Map();

const twoDigits = number => String(number).padStart(2, "0");
// "2026-10-27 08:30:00", local time: the date of every pack log.
export const timestampOf = date => `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())} `
    + `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`;

// The text's first line after the date, time and Pack Version; its other
// lines and the extra lines (an error's stack) below it, indented.
export function datedEntryOf(text, now, extraLines = "") {
    const [first, ...others] = `${text}\n${extraLines}`.split(/\r?\n/);
    const continuation = others.map(other => other.trim()).filter(other => other.length > 0).map(other => CONTINUATION_INDENT + other);
    return [`${timestampOf(now)} v${PACK_VERSION} ${first}`, ...continuation].map(entryLine => `${entryLine}\r\n`).join("");
}

function rotateWhenFull(files, folder, path, logFile) {
    const info = files.getFileInfo(path);
    if (!info || info.size <= ROTATION_SIZE_BYTES) return;
    const oldPath = `${folder}\\${logFile.oldName}`;
    if (files.fileExists(oldPath)) files.deleteFile(oldPath);
    files.renameFile(path, oldPath);
}

// logFile: ERROR_LOG_FILE or INFO_LOG_FILE. host: getProjectFolder and files.
// entries: datedEntryOf's text. report: where the one failure line goes.
export function appendDatedEntries(logFile, host, entries, report) {
    let state = null;
    const reportFailure = (writeError) => {
        if (state && state.failureLogged) return;
        if (state) state.failureLogged = true;
        report(`[${logFile.scriptName}] ${logFile.name} could not be written: ${writeError.message}`);
    };
    try {
        const folder = host.getProjectFolder();
        const path = `${folder}\\${logFile.name}`;
        if (!sessionStates.has(path)) sessionStates.set(path, { rotationChecked: false, failureLogged: false });
        state = sessionStates.get(path);
        if (!state.rotationChecked) {
            state.rotationChecked = true;
            // A failed rotation still lets these entries in, the file staying over 1 MB.
            try {
                rotateWhenFull(host.files, folder, path, logFile);
            } catch (rotationError) {
                reportFailure(rotationError);
            }
        }
        host.files.appendText(path, entries);
    } catch (writeError) {
        reportFailure(writeError);
    }
}
