// ============================================================
// Shared NVRAM watch: notes the .nv files' dates at a VPX launch
// ("prelaunch") and tells each watching Add-on, in "postlaunch", the ROMs
// whose .nv file changed during the game. Used by the Table ROMs .nv
// confirmation.
// - Watchers hear the game in the order they watch, all within "postlaunch".
// - The NVRAM folder is found as PinballY finds it; not found, each watcher hears it once.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";

const WATCH_NAME = "NvramWatch";
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

export function createNvramWatch(host) {
    // Each: { onGameEnded({ configId, folder, changed (ROM names) }),
    // onFolderMissing(where), missingHeard }, its handlers guarded.
    const watchers = [];
    // At launch: { configId, folder, dates (ms by ROM name) }.
    let launched = null;

    // The modified date of each .nv file, by its ROM name; null when the folder doesn't exist.
    function nvDatesIn(folder) {
        const infos = host.files.listFileInfos(folder);
        if (infos === null) return null;
        const dates = new Map();
        for (const info of infos) {
            const nvFile = NV_FILE.exec(info.name);
            if (nvFile) dates.set(nvFile[1], info.modified);
        }
        return dates;
    }

    // Fires as a table launches: any earlier launch never reached "postlaunch".
    host.on("prelaunch", safeHandler(WATCH_NAME, (ev) => {
        launched = null;
        const game = ev.game;
        if (!game) return;
        const gameFile = game.resolveGameFile();
        if (!gameFile.exists || !/\.vpx$/i.test(gameFile.path)) return;
        const folder = nvramFolderOf(host, game);
        const dates = folder === null ? null : nvDatesIn(folder);
        if (dates === null) {
            const where = folder === null ? "no NVRAM path in the system settings nor nvram_directory in the registry" : `no folder at ${folder}`;
            for (const watcher of watchers.filter(candidate => !candidate.missingHeard)) {
                watcher.missingHeard = true;
                watcher.onFolderMissing(where);
            }
            return;
        }
        launched = { configId: game.configId, folder, dates };
    }));

    // Fires after the game, back on the wheel.
    host.on("postlaunch", safeHandler(WATCH_NAME, () => {
        const before = launched;
        launched = null;
        if (!before) return;
        const after = nvDatesIn(before.folder);
        if (after === null) return;
        const changed = [...after].filter(([name, modified]) => before.dates.get(name) !== modified).map(([name]) => name);
        for (const watcher of watchers) watcher.onGameEnded({ configId: before.configId, folder: before.folder, changed: [...changed] });
    }));

    return {
        // Errors in the handlers are logged under scriptName.
        watch: (scriptName, { onGameEnded = () => {}, onFolderMissing = () => {} }) => {
            watchers.push({
                onGameEnded: safeHandler(scriptName, onGameEnded), onFolderMissing: safeHandler(scriptName, onFolderMissing), missingHeard: false,
            });
        },
    };
}

let sharedWatch = null;

export function getNvramWatch() {
    if (!sharedWatch) sharedWatch = createNvramWatch(createPinballYHost());
    return sharedWatch;
}
