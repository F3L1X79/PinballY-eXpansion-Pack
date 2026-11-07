// ============================================================
// .nv confirmation of the Table ROMs Add-on: hears from the shared NVRAM
// watch which .nv files changed during a VPX game; the one .nv that changed
// is the ROM the table really ran.
// - Several changed .nv files are only logged; a missing NVRAM folder is logged once.
// - Watching first, at init, it writes the confirmation before the Add-ons registered later hear the game.
// ============================================================

import { createNvramWatch } from "../vpxtool/nvram_watch.js";
import { SCRIPT_NAME } from "./table_rom_record.js";

// watch: the shared NVRAM watch (common/vpxtool/nvram_watch.js); its own
// one by default, for a confirmation made alone on a host.
export function createNvConfirmation(host, record, watch = createNvramWatch(host)) {
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    watch.watch(SCRIPT_NAME, {
        onFolderMissing: where => log(`VPinMAME's NVRAM folder not found (${where}); the ROMs are not confirmed after a game.`),
        onGameEnded: ({ configId, changed }) => {
            if (changed.length === 1) record.applyNvConfirmation(configId, changed[0]);
            else if (changed.length > 1) log(`"${configId}": several .nv files changed during the game (${changed.map(rom => `${rom}.nv`).join(", ")}); no ROM confirmed.`);
        },
    });
}
