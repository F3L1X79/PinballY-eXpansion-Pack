// ============================================================
// .nv confirmation of the Table ROMs Add-on: notes the NVRAM .nv files at a
// VPX launch ("prelaunch") and lists them again after ("postlaunch"); the one
// .nv that changed is the ROM the table really ran.
// - Several changed .nv files are only logged.
// - The NVRAM folder is found as PinballY finds it; not found, it is logged once.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { SCRIPT_NAME } from "./table_rom_record.js";

const NVRAM_DIRECTORY_KEY = "Software\\Freeware\\Visual PinMame\\globals\\nvram_directory";
const NV_FILE = /^(.+)\.nv$/i;

// The table's NVRAM folder: its system's NVRAM path, else VPinMAME's
// nvram_directory in the registry; null when neither is set.
export function nvramFolderOf(host, game) {
    const systemPath = game.system && game.system.nvramPath;
    if (typeof systemPath === "string" && systemPath.trim() !== "") return systemPath.trim();
    for (const root of ["HKCU", "HKLM"]) {
        const folder = host.readRegistryValue(`${root}\\${NVRAM_DIRECTORY_KEY}`);
        if (folder !== null && folder.trim() !== "") return folder.trim();
    }
    return null;
}

export function createNvConfirmation(host, record) {
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    let folderMissingLogged = false;
    // At launch: { configId, folder, dates (ms by .nv file name) }.
    let launched = null;

    // The modified date of each .nv file; null when the folder doesn't exist.
    function nvDatesIn(folder) {
        const infos = host.files.listFileInfos(folder);
        if (infos === null) return null;
        const dates = new Map();
        for (const info of infos) if (NV_FILE.test(info.name)) dates.set(info.name, info.modified);
        return dates;
    }

    // Fires as a table launches: any earlier launch never reached "postlaunch".
    host.on("prelaunch", safeHandler(SCRIPT_NAME, (ev) => {
        launched = null;
        const game = ev.game;
        if (!game) return;
        const gameFile = game.resolveGameFile();
        if (!gameFile.exists || !/\.vpx$/i.test(gameFile.path)) return;
        const folder = nvramFolderOf(host, game);
        const dates = folder === null ? null : nvDatesIn(folder);
        if (dates === null) {
            if (!folderMissingLogged) {
                folderMissingLogged = true;
                const where = folder === null ? "no NVRAM path in the system settings nor nvram_directory in the registry" : `no folder at ${folder}`;
                log(`VPinMAME's NVRAM folder not found (${where}); the ROMs are not confirmed after a game.`);
            }
            return;
        }
        launched = { configId: game.configId, folder, dates };
    }));

    // Fires after the game, back on the wheel; runs before the Add-ons
    // registered later read anything that depends on the ROM.
    host.on("postlaunch", safeHandler(SCRIPT_NAME, () => {
        const before = launched;
        launched = null;
        if (!before) return;
        const after = nvDatesIn(before.folder);
        if (after === null) return;
        const changed = [...after].filter(([name, modified]) => before.dates.get(name) !== modified).map(([name]) => name);
        if (changed.length === 1) record.applyNvConfirmation(before.configId, NV_FILE.exec(changed[0])[1]);
        else if (changed.length > 1) log(`"${before.configId}": several .nv files changed during the game (${changed.join(", ")}); no ROM confirmed.`);
    }));
}
