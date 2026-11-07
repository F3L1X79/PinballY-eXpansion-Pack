// ============================================================
// Table ROMs: fills each VPX table's ROM field silently from its script, read
// by tools\vpxtool.exe one table at a time, never during a game, 10 s after
// startup or at once after a Script Reader install; the .nv file of each game
// confirms it. Writes table_roms.json next to cabinet.json, and logfile.log.
// vpxtool missing or older brings the Script Reader Prompt; its version is read again first.
// - Never overwrites a ROM typed by hand.
// - The confirmation is written in "postlaunch" so later Add-ons see it.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { createTableRomRecord, SCRIPT_NAME } from "../common/table_roms/table_rom_record.js";
import { createScriptQueue } from "../common/table_roms/script_queue.js";
import { createNvConfirmation } from "../common/table_roms/nv_confirmation.js";
import { getScriptReaderInstaller } from "../common/table_roms/script_reader_install.js";
import { startScriptReaderPrompt } from "../common/table_roms/script_reader_prompt.js";
import { getScriptReaderState } from "../common/table_roms/script_reader_state.js";

// Leaves PinballY's own startup work (videos, first wheel draw) alone.
const STARTUP_DELAY_MS = 10 * 1000;

export default function init() {
    const host = createPinballYHost();
    const profileStore = getProfileStore();
    const record = createTableRomRecord(host, profileStore);
    const installer = getScriptReaderInstaller();
    const queue = createScriptQueue(host, record, { isHeld: installer.isRunning, version: getScriptReaderState() });
    // The swap waits for a run already going on the vpxtool it replaces.
    installer.waitWhile(queue.isBusy);
    createNvConfirmation(host, record);
    // The reading starts at once after an install, or goes on with the old vpxtool after a failure.
    installer.onFinished(installed => {
        if (installed) queue.start();
        queue.resume();
    });
    // Checked at once, unlike the reading: the prompt comes before the Startup
    // Screen, from the version remembered at an earlier start.
    const vpxtoolFound = queue.findVpxtool();
    startScriptReaderPrompt();
    if (!vpxtoolFound) return;
    host.setTimeout(safeHandler(SCRIPT_NAME, queue.start), STARTUP_DELAY_MS);}
