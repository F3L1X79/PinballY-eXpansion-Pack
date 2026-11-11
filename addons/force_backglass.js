// ============================================================
// Forces the backglass window visible at startup, hides it while a table
// runs (VPX draws its own) and shows it again back at the wheel.
// Listens to "gamestarted" and "gameover".
// - On a single screen it hides the backglass instead: PinballY reopens it over the playfield.
// - showWindow() saves BackglassWindow.Visible: each hide puts the owner's value back, or it opens hidden.
// ============================================================

import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";

const SCRIPT_NAME = "ForceBackglass";
const VISIBLE_SETTING = "BackglassWindow.Visible";

export default function init() {
    const host = createPinballYHost();

    // Hidden for this session only. PinballY shows it again by itself after
    // a game when the setting says so (docs/pinbally/pinbally-help.md, 2.1).
    function hideForNow() {
        const saved = host.settings.getBool(VISIBLE_SETTING, true);
        host.showBackglass(false);
        host.settings.set(VISIBLE_SETTING, saved);
    }

    // Checked on every change, since a screen can be plugged in or out
    // while PinballY runs.
    const showBackglass = visible => {
        if (host.countMonitors() > 1 && visible) host.showBackglass(true);
        else hideForNow();
    };

    // Deferred until main.js has finished so the show wins over a hidden
    // window PinballY opened from its setting.
    host.setTimeout(safeHandler(SCRIPT_NAME, () => {
        const monitors = host.countMonitors();
        if (monitors <= 1) host.log(`[${SCRIPT_NAME}] ${monitors} monitor seen at startup: backglass hidden for this session.`);
        showBackglass(true);
    }), 0);
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => showBackglass(false)));
    host.on("gameover", safeHandler(SCRIPT_NAME, () => showBackglass(true)));
}
