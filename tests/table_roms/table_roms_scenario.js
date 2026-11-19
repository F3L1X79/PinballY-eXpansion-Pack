// ============================================================
// Table ROMs tests' setup: main.js with only Table ROMs on, over tables whose
// files, record and fake vpxtool the test describes; runs the reading queue
// and reads back ROM fields, log lines, record and tables read.
// Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { DWELL_MS } from "../../common/table_roms/pending_rom_writer.js";

export const NOW = new Date(2026, 9, 12, 20, 0, 0);
export const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
export const RECORD_FILE = `${PROFILES_FOLDER}\\table_roms.json`;
export const VPXTOOL = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\vpxtool.exe";
export const TABLES_FOLDER = "C:\\Visual Pinball\\Tables";
const INFO_LOG = "C:\\PinballY\\Scripts\\ExpansionPack\\logs\\info.log";
export const NVRAM_FOLDER = "C:\\Visual Pinball\\VPinMAME\\nvram";
export const NVRAM_REGISTRY_KEY = "HKCU\\Software\\Freeware\\Visual PinMame\\globals\\nvram_directory";
// Before the game's .nv files are written.
const GAME_MS = 5 * 60 * 1000;
// Long enough for the queue to read every table, slow ones included.
const LONG_ENOUGH_MS = 60 * 60 * 1000;

export const vpxFile = configId => `${TABLES_FOLDER}\\${configId}.vpx`;
export const vbsFile = configId => `${TABLES_FOLDER}\\${configId}.vbs`;

// A table in PinballY's game list, its game file a .vpx by default; no
// rom when its ROM field is empty.
// system: its system's settings, such as { nvramPath }.
export function table(configId, { rom, gameFile = vpxFile(configId), isHidden = false, system } = {}) {
    const game = { configId, title: configId, gameFile, isHidden };
    if (rom !== undefined) game.rom = rom;
    if (system !== undefined) game.system = system;
    return game;
}

// vpxtool's answer to "romname <table file>", by table file: a ROM name,
// null when the script loads no ROM, or the run itself ({ output,
// errorOutput, exitCode, durationMs }). A file it has no answer for is
// unreadable: exit code 1. The "--version" key gives the run of its --version.
export const fakeVpxtool = answers => (args) => {
    // At the Script Reader Version unless the test says otherwise.
    if (args[0] === "--version") return answers["--version"] ?? { output: "vpxtool git:v0.38.0\n" };
    const answer = answers[args[1]];
    if (answer === undefined) return { exitCode: 1, output: "" };
    if (answer === null) return { output: "" };
    if (typeof answer === "string") return { output: `${answer}\n` };
    return answer;
};

// files: { path: { content, modified (a date, or its ms) } } seeded before startup (table
// files, the record file); vpxtool: the fake's answers, or none when it
// is not installed; vpxtoolModified: when vpxtool.exe was last written;
// nvramFolder: VPinMAME's NVRAM folder in the registry, none when null;
// nvFiles: the ROM names of the .nv files already in it.
export async function startTableRoms({
    tables, files = {}, vpxtool, vpxtoolModified = NOW, enabled = true, nvramFolder = NVRAM_FOLDER, nvFiles = [],
}) {
    const fake = createFakePinballYHost({ now: NOW, tables });
    if (nvramFolder !== null) {
        fake.setRegistryValue(NVRAM_REGISTRY_KEY, nvramFolder);
        fake.addFolder(nvramFolder);
    }
    for (const rom of nvFiles) fake.addFile(`${nvramFolder}\\${rom}.nv`, "nvram", { modified: new Date(2026, 0, 1) });
    for (const [path, { content = "script", modified = NOW }] of Object.entries(files)) fake.addFile(path, content, { modified: new Date(modified) });
    if (vpxtool) fake.addProgram(VPXTOOL, fakeVpxtool(vpxtool), { modified: new Date(vpxtoolModified) });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = enabled && key === "tableRoms";

    await import("../../main.js");
    await settle();

    // The player turns the wheel to the table: "gameselect" fires with it.
    const select = (configId) => {
        const offset = fake.getWheelTables().findIndex(game => game.configId === configId);
        if (offset < 0) throw new Error(`Not in the wheel: ${configId}`);
        fake.moveWheel(offset);
    };

    return {
        fake,
        readScripts: () => fake.advanceTime(LONG_ENOUGH_MS),
        // Each table's ROM field, "" when empty, hidden tables included.
        roms: () => Object.fromEntries(fake.getAllTables().map(game => [game.configId, game.rom || ""])),
        log: () => fake.logLines().filter(line => line.startsWith("[TableRoms]")),
        record: () => {
            const text = fake.readFile(RECORD_FILE);
            return text === undefined ? undefined : JSON.parse(text);
        },
        // Plays the table as PinballY launches it; VPinMAME writes the .nv
        // of each ROM in nvWritten (in folder, the NVRAM folder by default)
        // as the game ends.
        play: async (configId, { nvWritten = [], folder = nvramFolder, durationMs = GAME_MS } = {}) => {
            const game = fake.getAllTables().find(candidate => candidate.configId === configId);
            fake.playGame(game);
            await settle();
            fake.gameStarted(game);
            fake.advanceTime(durationMs);
            for (const rom of nvWritten) fake.addFile(`${folder}\\${rom}.nv`, "nvram");
            fake.gameOver(game);
        },
        // The player stays on each table in turn for the dwell, then turns
        // back to the first: every pending ROM among them is written.
        dwellOnEach: (configIds) => {
            for (const configId of [...configIds, configIds[0]]) {
                select(configId);
                fake.advanceTime(DWELL_MS);
            }
        },
        // The ROM a script read left pending, by table.
        pendingRoms: () => {
            const text = fake.readFile(RECORD_FILE);
            const tables = text === undefined ? {} : JSON.parse(text).tables;
            return Object.fromEntries(Object.entries(tables).filter(([, entry]) => entry.pending !== undefined).map(([configId, entry]) => [configId, entry.pending]));
        },
        select,
        // The ROM fields PinballY was asked to write, in order: [configId, rom].
        romUpdates: () => fake.gameUpdates().filter(update => "rom" in update.changes).map(update => [update.configId, update.changes.rom]),
        // The Table ROMs cabinet checks of info.log (its lines also in
        // logfile.log left out), without their date, once written (next tick).
        infoLines: async () => {
            await settle();
            const logged = new Set(fake.logLines());
            const text = fake.readFile(INFO_LOG) ?? "";
            return text.split(/\r?\n/).filter(line => line.includes("[TableRoms]"))
                .map(line => line.slice(line.indexOf("[TableRoms]"))).filter(line => !logged.has(line));
        },
        // The table files vpxtool was asked to read, in order.
        scriptsRead: () => fake.programRuns().filter(run => run.args[0] === "romname").map(run => run.args[1]),
    };
}
