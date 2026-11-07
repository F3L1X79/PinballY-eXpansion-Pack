// ============================================================
// Temporary NVRAM probe for the cabinet checks of #482: only when the folder
// nvram_probe exists in the pack's folder, runs "vpxtool nvram show" once on
// every .nv of the NVRAM folder, then on the table's .nv copied at each
// launch and on every .nv the game changed. Saves each answer as a .json and
// logs a summary to logfile.log and nvram_probe\probe.log.
// - Never runs vpxtool during a game; one run at a time.
// - Remove with the Play Scores tickets: nothing else depends on it.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { nvramFolderOf } from "./nv_confirmation.js";

const PROBE_NAME = "NvramProbe";
const PROBE_FOLDER_NAME = "nvram_probe";
// After the Table ROMs' own startup reading has begun.
const SWEEP_DELAY_MS = 20 * 1000;
const RUN_TIMEOUT_MS = 60 * 1000;
const POLL_MS = 200;
const NV_FILE = /^(.+)\.nv$/i;
const GAME_STATE_EXTRAS = ["player_count", "game_over", "current_player", "current_ball", "ignore_scores"];

const twoDigits = number => String(number).padStart(2, "0");
const stampOf = date => `${date.getFullYear()}${twoDigits(date.getMonth() + 1)}${twoDigits(date.getDate())}-`
    + `${twoDigits(date.getHours())}${twoDigits(date.getMinutes())}${twoDigits(date.getSeconds())}`;

// The first "game_state" object found in the parsed answer, at any depth.
function findGameState(node) {
    if (node === null || typeof node !== "object") return null;
    if (!Array.isArray(node) && node.game_state && typeof node.game_state === "object") return node.game_state;
    for (const child of Object.values(node)) {
        const found = findGameState(child);
        if (found) return found;
    }
    return null;
}

const hasValue = descriptor => descriptor !== null && typeof descriptor === "object" && descriptor.value !== undefined && descriptor.value !== null;

function describeValue(descriptor) {
    if (descriptor === undefined) return "absent";
    if (descriptor === null || typeof descriptor !== "object") return JSON.stringify(descriptor);
    if (descriptor.value !== undefined) return JSON.stringify(descriptor.value);
    // A field outside the NVRAM carries a warning instead of a value.
    const text = JSON.stringify(descriptor);
    if (/outside/i.test(text)) return "outside the NVRAM";
    return `no value ${text.slice(0, 120)}`;
}

const describeList = list => (Array.isArray(list) ? `[${list.map(describeValue).join(", ")}]` : describeValue(list));

// What "vpxtool nvram show" said, in one line: { hasScores, text }.
export function summarizeNvramShow(output) {
    const start = output.indexOf("{");
    const firstLine = (output.split(/\r?\n/).find(line => line.trim() !== "") || "").trim().slice(0, 200);
    if (start < 0) return { hasScores: false, text: `no JSON in the answer ("${firstLine}")` };
    let data;
    try {
        data = JSON.parse(output.slice(start));
    } catch (error) {
        return { hasScores: false, text: `answer not readable as JSON (${error.message}; first line "${firstLine}")` };
    }
    const gameState = findGameState(data);
    if (!gameState) return { hasScores: false, text: "no game_state in the answer" };
    const parts = [`scores ${describeList(gameState.scores)}`];
    if (gameState.final_scores !== undefined) parts.push(`final_scores ${describeList(gameState.final_scores)}`);
    for (const key of GAME_STATE_EXTRAS) if (gameState[key] !== undefined) parts.push(`${key} ${describeValue(gameState[key])}`);
    const hasScores = Array.isArray(gameState.scores) && gameState.scores.some(hasValue);
    return { hasScores, text: parts.join("; ") };
}

export function startNvramProbe(host, vpxtoolPath) {
    const probeFolder = `${host.getProjectFolder()}\\${PROBE_FOLDER_NAME}`;
    if (!host.files.folderExists(probeFolder)) return;
    const logPath = `${probeFolder}\\probe.log`;
    const log = text => {
        host.log(`[${PROBE_NAME}] ${text}`);
        try {
            host.files.appendText(logPath, `${stampOf(host.now())} ${text}\r\n`);
        } catch (error) {
            host.log(`[${PROBE_NAME}] could not write ${logPath}: ${error.message}`);
        }
    };
    const createFolder = path => {
        host.files.createFolder(path);
        return path;
    };

    // Each job: { nvPath, savePath, done(summary) }, run one at a time.
    const jobs = [];
    let running = false;
    let gameUnderWay = false;

    function runNext() {
        if (running || gameUnderWay) return;
        const job = jobs.shift();
        if (!job) return;
        running = true;
        const run = host.runHiddenProgram(vpxtoolPath, ["nvram", "show", job.nvPath]);
        const startMs = host.now().getTime();
        const poll = safeHandler(PROBE_NAME, () => {
            try {
                const result = run.result();
                if (result === null && host.now().getTime() - startMs < RUN_TIMEOUT_MS) {
                    host.setTimeout(poll, POLL_MS);
                    return;
                }
                if (result === null) job.done({ hasScores: false, text: `no answer from vpxtool within ${RUN_TIMEOUT_MS / 1000} s` });
                else {
                    host.files.writeText(job.savePath, result.output);
                    const summary = summarizeNvramShow(result.output);
                    job.done(result.exitCode === 0 ? summary : { hasScores: false, text: `vpxtool exit code ${result.exitCode}; ${summary.text}` });
                }
            } catch (error) {
                log(`ERROR on ${job.nvPath}: ${error.message}`);
            }
            running = false;
            runNext();
        });
        host.setTimeout(poll, POLL_MS);
    }

    const submit = job => {
        jobs.push(job);
        runNext();
    };

    // Check 1 of #482: every .nv once, until all\done.txt exists.
    function sweep() {
        const allFolder = createFolder(`${probeFolder}\\all`);
        const donePath = `${allFolder}\\done.txt`;
        if (host.files.fileExists(donePath)) return;
        const folders = [...new Set(host.getAllTables().map(game => nvramFolderOf(host, game)).filter(folder => folder !== null))];
        if (folders.length === 0) {
            log("sweep: no NVRAM folder found.");
            return;
        }
        const nvPaths = [];
        for (const folder of folders) {
            const names = host.files.listFiles(folder).filter(name => NV_FILE.test(name)).sort();
            for (const name of names) nvPaths.push(`${folder}\\${name}`);
        }
        log(`sweep: ${nvPaths.length} .nv files in ${folders.join(", ")}.`);
        const withScores = [];
        const without = [];
        nvPaths.forEach((nvPath, index) => {
            const name = nvPath.slice(nvPath.lastIndexOf("\\") + 1);
            submit({
                nvPath,
                savePath: `${allFolder}\\${name}.json`,
                done: summary => {
                    (summary.hasScores ? withScores : without).push(name);
                    log(`sweep ${name}: ${summary.text}`);
                    if (index !== nvPaths.length - 1) return;
                    const total = `sweep done: ${withScores.length} of ${nvPaths.length} .nv files give values in game_state.scores; without: ${without.join(", ") || "none"}.`;
                    log(total);
                    host.files.writeText(donePath, `${total}\r\n`);
                },
            });
        });
    }

    // At launch: { configId, rom, folder, dates, startMs, playFolder, beforePath }.
    let launched = null;

    function nvDatesIn(folder) {
        const infos = host.files.listFileInfos(folder);
        if (infos === null) return null;
        return new Map(infos.filter(info => NV_FILE.test(info.name)).map(info => [info.name, info.modified]));
    }

    function endGame() {
        if (!gameUnderWay) return;
        gameUnderWay = false;
        runNext();
    }

    // Fires as a table launches: copies the table's .nv before PinMAME opens it.
    host.on("prelaunch", safeHandler(PROBE_NAME, (ev) => {
        gameUnderWay = true;
        launched = null;
        host.setTimeout(safeHandler(PROBE_NAME, () => {
            if (host.getFullUIMode().runMode === undefined) endGame();
        }), 0);
        const game = ev.game;
        if (!game) return;
        const gameFile = game.resolveGameFile();
        if (!gameFile.exists || !/\.vpx$/i.test(gameFile.path)) return;
        const folder = nvramFolderOf(host, game);
        const dates = folder === null ? null : nvDatesIn(folder);
        if (dates === null) {
            log(`launch of "${game.configId}": no NVRAM folder.`);
            return;
        }
        const rom = typeof game.rom === "string" ? game.rom.trim() : "";
        const startMs = host.now().getTime();
        const playFolder = createFolder(`${createFolder(`${probeFolder}\\plays`)}\\${stampOf(host.now())}`);
        let beforePath = null;
        if (rom === "") log(`launch of "${game.configId}": ROM field empty, no .nv copied before the game.`);
        else if (!host.files.fileExists(`${folder}\\${rom}.nv`)) log(`launch of "${game.configId}": no ${rom}.nv yet in ${folder}.`);
        else {
            // Keeps the ROM's file name: vpxtool picks the map from it.
            beforePath = `${createFolder(`${playFolder}\\before`)}\\${rom}.nv`;
            host.files.copyFile(`${folder}\\${rom}.nv`, beforePath);
            log(`launch of "${game.configId}" (ROM ${rom}): ${rom}.nv copied before the game.`);
        }
        launched = { configId: game.configId, folder, dates, startMs, playFolder, beforePath };
    }));

    // Fires after the game: reads the copy taken at launch and each changed .nv.
    host.on("postlaunch", safeHandler(PROBE_NAME, () => {
        const before = launched;
        launched = null;
        if (before) {
            const seconds = Math.round((host.now().getTime() - before.startMs) / 1000);
            const after = nvDatesIn(before.folder) || new Map();
            const changed = [...after].filter(([name, modified]) => before.dates.get(name) !== modified).map(([name]) => name);
            log(`end of "${before.configId}" after ${seconds} s; .nv changed: ${changed.join(", ") || "none"}.`);
            if (before.beforePath) {
                const name = before.beforePath.slice(before.beforePath.lastIndexOf("\\") + 1);
                submit({
                    nvPath: before.beforePath, savePath: `${before.playFolder}\\before ${name}.json`,
                    done: summary => log(`"${before.configId}" before the game, ${name}: ${summary.text}`),
                });
            }
            const afterFolder = changed.length > 0 ? createFolder(`${before.playFolder}\\after`) : null;
            for (const name of changed) {
                const copyPath = `${afterFolder}\\${name}`;
                host.files.copyFile(`${before.folder}\\${name}`, copyPath);
                submit({
                    nvPath: copyPath, savePath: `${before.playFolder}\\after ${name}.json`,
                    done: summary => log(`"${before.configId}" after the game, ${name}: ${summary.text}`),
                });
            }
        }
        endGame();
    }));
    host.on("launcherror", safeHandler(PROBE_NAME, () => {
        launched = null;
        endGame();
    }));
    host.on("wheelmode", safeHandler(PROBE_NAME, () => {
        if (host.getFullUIMode().runMode === undefined) endGame();
    }));

    log(`started; answers saved in ${probeFolder}.`);
    host.setTimeout(safeHandler(PROBE_NAME, sweep), SWEEP_DELAY_MS);
}
