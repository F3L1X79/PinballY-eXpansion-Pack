// ============================================================
// Script reading queue of the Table ROMs Add-on: submits to the shared
// vpxtool runner first vpxtool's --version, then each VPX table whose
// script needs reading, and records the ROM each answer names.
// - A failure vpxtool answers is recorded: read again once the table or vpxtool changes.
// - A timeout is only logged: the table is read again next startup.
// ============================================================

import { logError } from "../core/error_log.js";
import { createVpxtoolRunner, VPXTOOL_RUN_TIMEOUT_MS } from "../vpxtool/vpxtool_runner.js";
import { SCRIPT_NAME } from "./table_rom_record.js";

export const SCRIPT_READ_TIMEOUT_MS = VPXTOOL_RUN_TIMEOUT_MS;
// Letters, digits and underscores only: anything else is not a ROM name.
const ROM_NAME = /^[A-Za-z0-9_]+$/;

// What vpxtool's standard output says: { rom } with the ROM named on its
// last non-empty line, { rom: null } when empty (the script loads no ROM),
// or { unreadable } with that line when it is no ROM name.
export function readRomOutput(output) {
    const lines = output.split(/\r?\n/).map(line => line.trim()).filter(line => line !== "");
    if (lines.length === 0) return { rom: null };
    const lastLine = lines[lines.length - 1];
    return ROM_NAME.test(lastLine) ? { rom: lastLine } : { unreadable: lastLine };
}

// version: what hears the --version run's answer
// (common/table_roms/script_reader_state.js); runner: the shared vpxtool
// runner (common/vpxtool/vpxtool_runner.js); its own one by default, for a
// queue made alone on a host.
export function createScriptQueue(host, record, { version = null, runner = createVpxtoolRunner(host) } = {}) {
    // vpxtool reads the script from the .vbs beside the .vpx when there is
    // one; vpxtool.exe's own state tells a new vpxtool after a failure.
    const fileStateOf = (vpxPath, vpxtool) => ({
        vpx: host.files.getFileInfo(vpxPath),
        vbs: host.files.getFileInfo(vpxPath.replace(/\.vpx$/i, ".vbs")),
        vpxtool,
    });

    function tablesToRead() {
        const vpxtool = host.files.getFileInfo(runner.vpxtoolPath);
        const tables = [];
        for (const game of host.getAllTables()) {
            const gameFile = game.resolveGameFile();
            if (!gameFile.exists || !/\.vpx$/i.test(gameFile.path)) continue;
            const state = fileStateOf(gameFile.path, vpxtool);
            if (record.needsScriptRead(game.configId, state)) tables.push({ configId: game.configId, path: gameFile.path, state });
        }
        return tables;
    }

    const logFailure = (table, reason, readAgain) => logError(SCRIPT_NAME, `ERROR reading the script of "${table.configId}": ${reason}; read again ${readAgain}.`, host);

    // vpxtool answered but could not read the table: the same files would fail again.
    function failedOnTable(table, reason) {
        logFailure(table, reason, "once the table or vpxtool changes");
        record.applyScriptFailure(table.configId, table.state);
    }

    function applyAnswer(table, { exitCode, output }) {
        if (exitCode !== 0) {
            failedOnTable(table, `vpxtool exit code ${exitCode}`);
            return;
        }
        const answer = readRomOutput(output);
        if (answer.unreadable !== undefined) {
            failedOnTable(table, `vpxtool's output is no ROM name: "${answer.unreadable}"`);
            return;
        }
        record.applyScriptRead(table.configId, table.state, answer.rom);
    }

    const tableRun = table => ({
        scriptName: SCRIPT_NAME,
        args: ["romname", table.path],
        apply: result => applyAnswer(table, result),
        fail: reason => logFailure(table, reason, "at the next startup"),
    });
    const versionRuns = version
        ? [{ scriptName: SCRIPT_NAME, args: ["--version"], apply: version.applyVersionAnswer, fail: version.versionUnreadable }]
        : [];
    let started = false;

    return {
        // True when vpxtool is in the tools folder; logs the error otherwise.
        findVpxtool: () => {
            if (runner.hasVpxtool()) return true;
            logError(SCRIPT_NAME, `ERROR vpxtool not found at ${runner.vpxtoolPath}; the table scripts are not read.`, host);
            return false;
        },
        // Once per start of PinballY: a second call does nothing.
        start: () => {
            if (started) return;
            started = true;
            for (const job of [...versionRuns, ...tablesToRead().map(tableRun)]) runner.submit(job);
        },
    };
}
