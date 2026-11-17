// ============================================================
// Shared NVRAM watch: notes the .nv files' dates when a VPX launch begins
// and tells each watching Add-on, when it ends (Launch Bracket), the ROMs
// whose .nv file changed during the game. Used by the Table ROMs .nv
// confirmation and High Scores.
// - Watchers hear the game in the order they watch, all at the launch's end.
// - The NVRAM folder is found as PinballY finds it; not found, each watcher hears it once.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { createLaunchBracket, getLaunchBracket } from "../core/launch_bracket.js";

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

export function createNvramWatch(host, launchBracket = createLaunchBracket(host)) {
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

    // Before the game: VPX has not written any .nv yet.
    function onBegan({ game }) {
        launched = null;
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
    }

    // After the game; a launch another script cancelled ran no game.
    function onEnded({ cancelled }) {
        const before = launched;
        launched = null;
        if (!before || cancelled) return;
        const after = nvDatesIn(before.folder);
        if (after === null) return;
        const changed = [...after].filter(([name, modified]) => before.dates.get(name) !== modified).map(([name]) => name);
        for (const watcher of watchers) watcher.onGameEnded({ configId: before.configId, folder: before.folder, changed: [...changed] });
    }

    launchBracket.subscribe(WATCH_NAME, { onBegan, onEnded });

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
    if (!sharedWatch) sharedWatch = createNvramWatch(createPinballYHost(), getLaunchBracket());
    return sharedWatch;
}
