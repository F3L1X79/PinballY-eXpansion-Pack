// ============================================================
// Info Log: info.log in the pack folder gets every line the pack writes to
// logfile.log (through the host's log), plus the checks to read after a
// cabinet run, written here with logInfo and never to logfile.log.
// Dating and rotation: see dated_log_file.js.
// - Never throws: a write failure is one logfile.log line per session.
// ============================================================

import { createPinballYHost } from "./pinbally_host.js";

let sharedHost = null;

// host: the caller's own, PinballY's globals otherwise.
export function logInfo(scriptName, message, host = null) {
    if (!host) {
        if (!sharedHost) sharedHost = createPinballYHost();
        host = sharedHost;
    }
    host.logInfo(`[${scriptName}] ${message}`);
}
