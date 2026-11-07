// ============================================================
// Error Log: every error the pack logs goes to logfile.log, its line
// unchanged, and to errors.log in the pack folder, which PinballY does not
// recreate at each launch. Once per start, an errors.log over 1 MB becomes
// errors.old.log before the first line. Warnings and information never come here.
// - Never throws for errors.log: a failure is one logfile.log line per session.
// - A passed Error's stack goes to errors.log only: never also put it in the message.
// ============================================================

import { createPinballYHost } from "./pinbally_host.js";
import { PACK_VERSION } from "./pack_version.js";

const SCRIPT_NAME = "ErrorLog";
const ERROR_LOG_NAME = "errors.log";
const OLD_ERROR_LOG_NAME = "errors.old.log";
const ROTATION_SIZE_BYTES = 1024 * 1024;
const STACK_INDENT = "    ";

// By errors.log path: whichever host instance writes first rotates the file
// and reports a failure, once for the whole session.
const sessionStates = new Map();
let sharedHost = null;

const twoDigits = number => String(number).padStart(2, "0");
// "2026-10-27 08:30:00", local time: the Error Log's and the pack's other logs' date.
export const timestampOf = date => `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())} `
    + `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`;

// The error's stack without its "<Name>: <message>" header, which the
// message already gives; "" when it has none.
function stackOf(error) {
    const stack = error && typeof error.stack === "string" ? error.stack : "";
    const header = String(error);
    return stack.startsWith(header) ? stack.slice(header.length) : stack;
}

// The logfile.log line's first line after the date, time and Pack Version;
// its other lines and the error's stack below it, indented.
function entryOf(line, error, now) {
    const [first, ...others] = `${line}\n${stackOf(error)}`.split(/\r?\n/);
    const stack = others.map(other => other.trim()).filter(other => other.length > 0).map(other => STACK_INDENT + other);
    return [`${timestampOf(now)} v${PACK_VERSION} ${first}`, ...stack].map(entryLine => `${entryLine}\r\n`).join("");
}

function rotateWhenFull(files, folder, path) {
    const info = files.getFileInfo(path);
    if (!info || info.size <= ROTATION_SIZE_BYTES) return;
    const oldPath = `${folder}\\${OLD_ERROR_LOG_NAME}`;
    if (files.fileExists(oldPath)) files.deleteFile(oldPath);
    files.renameFile(path, oldPath);
}

// message: the line's text after "[<scriptName>] ", as logfile.log shows it
// ("ERROR ..."), with the stack on its next lines when there is one. host:
// the caller's own, PinballY's globals otherwise. error: the caught Error,
// whose stack goes to errors.log only.
export function logError(scriptName, message, host = null, error = null) {
    if (!host) {
        if (!sharedHost) sharedHost = createPinballYHost();
        host = sharedHost;
    }
    const line = `[${scriptName}] ${message}`;
    host.log(line);

    let state = null;
    const reportFailure = (writeError) => {
        if (state && state.failureLogged) return;
        if (state) state.failureLogged = true;
        host.log(`[${SCRIPT_NAME}] ${ERROR_LOG_NAME} could not be written: ${writeError.message}`);
    };
    try {
        const folder = host.getProjectFolder();
        const path = `${folder}\\${ERROR_LOG_NAME}`;
        if (!sessionStates.has(path)) sessionStates.set(path, { rotationChecked: false, failureLogged: false });
        state = sessionStates.get(path);
        if (!state.rotationChecked) {
            state.rotationChecked = true;
            // A failed rotation still lets this line in, the file staying over 1 MB.
            try {
                rotateWhenFull(host.files, folder, path);
            } catch (rotationError) {
                reportFailure(rotationError);
            }
        }
        host.files.appendText(path, entryOf(line, error, host.now()));
    } catch (writeError) {
        reportFailure(writeError);
    }
}
