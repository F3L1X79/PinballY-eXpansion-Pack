// ============================================================
// Wheel Arrival Sound: plays config.wheelArrivalSoundFile once per start, at
// the Wheel Arrival (see common/core/startup_screen.js). Loaded at init on a
// player of its own; an empty setting, the default, plays and logs nothing.
// - Never host.playSound(): its one shared player would cut, or be cut by, the Profile Greeting's and the toasts' sounds.
// - A file that cannot be loaded at init is logged once and the sound stays off for the session.
// ============================================================

import config from "../common/core/config.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { logError } from "../common/core/error_log.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { onWheelArrival } from "../common/core/startup_screen.js";

const SCRIPT_NAME = "WheelArrivalSound";

export default function init() {
    const filePath = config.wheelArrivalSoundFile;
    if (typeof filePath !== "string" || filePath.length === 0) return;

    const host = createPinballYHost();
    let sound;
    try {
        sound = host.createSoundRotation(filePath, 1);
    } catch (error) {
        logError(SCRIPT_NAME, `ERROR: WHEEL_ARRIVAL_SOUND_FILE cannot be loaded, no sound at the Wheel Arrival (${error.message}).`, host, error);
        return;
    }

    onWheelArrival(safeHandler(SCRIPT_NAME, () => sound.play()));
}
