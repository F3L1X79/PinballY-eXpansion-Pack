// ============================================================
// An Easter Egg's sound, loaded soon after startup since a player that has
// just been created plays too late. A missing or unreadable file is logged
// and the Easter Egg plays silently.
// - A started sound plays to its end: the pack's sound rotation has no stop.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";

const LOAD_DELAY_MS = 1000;

// file: from the project's folder.
export function createEasterEggSound(host, scriptName, file) {
    const path = `${host.getProjectFolder()}\\${file}`;
    // The player: null until loaded, false once it could not be.
    let sound = null;

    function load() {
        if (sound !== null) return;
        try {
            sound = host.createSoundRotation(path, 1);
        } catch (error) {
            sound = false;
            host.log(`[${scriptName}] Its sound cannot be loaded, it plays silently: ${error.message}`);
        }
    }

    host.setTimeout(safeHandler(scriptName, load), LOAD_DELAY_MS);

    return {
        load,
        // A sound that cannot play is logged and never stops the effect.
        play: safeHandler(scriptName, () => {
            if (sound) sound.play();
        }),
    };
}
