// ============================================================
// Error Log: every error the pack logs goes to logfile.log (and so the Info
// Log), its line unchanged, and to errors.log in the pack folder, which
// PinballY does not recreate at each launch. Dating and rotation: see
// dated_log_file.js. Warnings and information never come here.
// - Never throws for errors.log: a failure is one logfile.log line per session.
// - A passed Error's stack goes to errors.log only: never also put it in the message.
// ============================================================

import { createPinballYHost } from "./pinbally_host.js";
import { ERROR_LOG_FILE, appendDatedEntries, datedEntryOf } from "./dated_log_file.js";

let sharedHost = null;

// The error's stack without its "<Name>: <message>" header, which the
// message already gives; "" when it has none.
function stackOf(error) {
    const stack = error && typeof error.stack === "string" ? error.stack : "";
    const header = String(error);
    return stack.startsWith(header) ? stack.slice(header.length) : stack;
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
    appendDatedEntries(ERROR_LOG_FILE, host, datedEntryOf(line, host.now(), stackOf(error)), text => host.log(text));
}
