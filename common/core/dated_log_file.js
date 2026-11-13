// ============================================================
// The pack's log files, in its logs folder: the Error Log's errors.log and
// the Info Log's info.log, each entry dated with the Pack Version, and the
// Play Score anomaly log. Once per session and file: the logs folder is made,
// a file an older version left in the pack folder moves in, and a full file
// becomes its ".old.log" before the session's first entry.
// - Never throws: a failure is one line per file and session, through the caller's report.
// ============================================================

import { PACK_VERSION } from "./pack_version.js";

export const LOGS_FOLDER_NAME = "logs";
export const ERROR_LOG_FILE = { name: "errors.log", oldName: "errors.old.log", scriptName: "ErrorLog", rotationBytes: 1024 * 1024 };
export const INFO_LOG_FILE = { name: "info.log", oldName: "info.old.log", scriptName: "InfoLog", rotationBytes: 1024 * 1024 };

const CONTINUATION_INDENT = "    ";

// By file path: whichever host instance writes first prepares the file and
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

export const logPathOf = (packFolder, fileName) => `${packFolder}\\${LOGS_FOLDER_NAME}\\${fileName}`;

// The logs folder made again at each write: the owner may delete it during a session.
export function appendToLog(files, packFolder, fileName, text) {
    files.createFolder(`${packFolder}\\${LOGS_FOLDER_NAME}`);
    files.appendText(logPathOf(packFolder, fileName), text);
}

// Before the session's first entry. logFile: { name, oldName, rotationBytes }.
// A file in the logs folder already wins over one left in the pack folder.
export function prepareLogFile(files, packFolder, logFile) {
    files.createFolder(`${packFolder}\\${LOGS_FOLDER_NAME}`);
    for (const name of [logFile.name, logFile.oldName]) {
        const leftover = `${packFolder}\\${name}`;
        if (files.fileExists(leftover) && !files.fileExists(logPathOf(packFolder, name))) files.renameFile(leftover, logPathOf(packFolder, name));
    }
    const path = logPathOf(packFolder, logFile.name);
    const info = files.getFileInfo(path);
    if (!info || info.size <= logFile.rotationBytes) return;
    const oldPath = logPathOf(packFolder, logFile.oldName);
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
        const packFolder = host.getProjectFolder();
        const path = logPathOf(packFolder, logFile.name);
        if (!sessionStates.has(path)) sessionStates.set(path, { prepared: false, failureLogged: false });
        state = sessionStates.get(path);
        if (!state.prepared) {
            state.prepared = true;
            // A failed preparation still lets these entries try, the file maybe staying full.
            try {
                prepareLogFile(host.files, packFolder, logFile);
            } catch (preparationError) {
                reportFailure(preparationError);
            }
        }
        appendToLog(host.files, packFolder, logFile.name, entries);
    } catch (writeError) {
        reportFailure(writeError);
    }
}
