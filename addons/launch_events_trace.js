// ============================================================
// Debugging trace of PinballY's launch events, on only when logLaunchEvents
// is on in common/core/config.js (LOG_LAUNCH_EVENTS in .env.local): one log
// line per event, to check on the cabinet the order documented in
// docs/pinbally/pinbally-help.md ("Interleaved launch order").
// - Never prevents nor changes an event: it only reads them.
// ============================================================

import config from "../common/core/config.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";

const SCRIPT_NAME = "LaunchEvents";

const LAUNCH_EVENTS = [
    "prelaunch", "launchoverlayshow", "launchoverlaymessage", "runbeforepre", "runbefore",
    "gamestarted", "gameover", "launcherror", "runafter", "runafterpost",
    "launchoverlayhide", "postlaunch",
];

const pad = (number, width) => String(number).padStart(width, "0");

function timestamp() {
    const now = new Date();
    return `${pad(now.getHours(), 2)}:${pad(now.getMinutes(), 2)}:${pad(now.getSeconds(), 2)}.${pad(now.getMilliseconds(), 3)}`;
}

function idOrTableTitle(ev) {
    if (ev.type === "launchoverlaymessage") return ev.id;
    return ev.game ? ev.game.title : "(no table)";
}

export default function init() {
    if (!config.logLaunchEvents) return;
    const host = createPinballYHost();

    // Fires on every launch event; a single string, so a "%" in a title is written as is.
    const trace = safeHandler(SCRIPT_NAME, ev => {
        host.log(`[${SCRIPT_NAME}] ${timestamp()} ${ev.type} ${idOrTableTitle(ev)}`);
    });
    for (const type of LAUNCH_EVENTS) mainWindow.on(type, trace);
}
