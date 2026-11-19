// ============================================================
// Plays a sound effect when a table is launched ("gamestarted") and stops it
// on "gameover", using the Windows Media Player COM component (WMPlayer.OCX)
// via OLE automation, which requires the "Windows Media Player" optional
// Windows feature. Does nothing (one log line at startup) when
// config.launchSoundFile is empty. Plays at config.launchSoundVolume.
// - Windows Media Player plays outside PinballY's audio: its volume is the pack's to set.
// ============================================================

import config, { DEFAULTS } from "../common/core/config.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { logError } from "../common/core/error_log.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";

const SCRIPT_NAME = "LaunchSound";
const MAX_VOLUME = 100;

// The configured volume, or the default (with one Error Log line) when it is outside 0-100.
function volumeOrDefault(host, volume) {
    if (volume >= 0 && volume <= MAX_VOLUME) return Math.round(volume);
    logError(SCRIPT_NAME, `ERROR: LAUNCH_SOUND_VOLUME must be from 0 to ${MAX_VOLUME}, not ${volume}; `
        + `using ${DEFAULTS.launchSoundVolume}.`, host);
    return DEFAULTS.launchSoundVolume;
}

function initializeMediaPlayer(volume) {
    try {
        const player = createAutomationObject("WMPlayer.OCX.7");
        player.settings.autoStart = true;
        player.settings.volume = volume;
        return player;
    } catch (error) {
        logError(
            SCRIPT_NAME,
            "ERROR: could not initialize Windows Media Player ("
            + error.message
            + "). Is the 'Windows Media Player' optional feature enabled?",
            null,
            error
        );
        return null;
    }
}

export default function init() {
    const host = createPinballYHost();
    const filePath = config.launchSoundFile;
    if (typeof filePath !== "string" || filePath.length === 0) {
        host.log(`[${SCRIPT_NAME}] launchSoundFile is not set in common/core/config.js; launch sound disabled.`);
        return;
    }

    const mediaPlayer = initializeMediaPlayer(volumeOrDefault(host,config.launchSoundVolume));

    // Fires on table launch: starts playing the configured sound file.
    mainWindow.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        if (!mediaPlayer) return;

        try {
            mediaPlayer.URL = filePath;
        } catch (error) {
            logError(SCRIPT_NAME, "ERROR: could not play launch sound (" + error.message + ").", null, error);
        }
    }));

    // Fires on table exit: stops the sound if it is still playing.
    mainWindow.on("gameover", safeHandler(SCRIPT_NAME, () => {
        if (!mediaPlayer) return;

        try {
            mediaPlayer.controls.stop();
        } catch (error) {
            host.log(`[${SCRIPT_NAME}] WARNING: could not stop launch sound (${error.message}).`);
        }
    }));
}
