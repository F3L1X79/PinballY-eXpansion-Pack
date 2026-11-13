// ============================================================
// Table ROM record: the Table ROMs Add-on's memory in table_roms.json next to
// cabinet.json: per table, its file state when last read (or when vpxtool
// failed on it), the ROM found and the ROM last written into PinballY.
// Every write goes through decideRomWrite().
// - Saved through the Profile store, so no Profile Reset touches it.
// ============================================================

const RECORD_NAME = "table_roms";
const RECORD_VERSION = 1;
// The Table ROMs Add-on's name in logfile.log, for its shared modules too.
export const SCRIPT_NAME = "TableRoms";

export const ROM_SOURCE = Object.freeze({ script: "script", nv: "nv" });
export const ROM_DECISION = Object.freeze({ write: "write", confirm: "confirm", disagree: "disagree", nothing: "nothing" });

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const isEmptyRom = rom => typeof rom !== "string" || rom.trim() === "";
const sameRom = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const sameFileState = (a, b) => (a === null || b === null
    ? a === b
    : a.modified === b.modified && a.size === b.size);

// Whether a finding ({ rom, source }) goes into PinballY's ROM field
// (write), confirms the Add-on's own script guess already there
// (confirm), contradicts a hand-typed ROM (disagree) or changes nothing.
// The field is the Add-on's own when it holds the ROM the Add-on last
// wrote (written: { rom, source }, or none); a script guess never
// replaces a ROM a .nv confirmed.
export function decideRomWrite(currentRom, written, finding) {
    if (isEmptyRom(currentRom)) return ROM_DECISION.write;
    const isOwnRom = Boolean(written) && sameRom(currentRom, written.rom);
    if (sameRom(currentRom, finding.rom)) {
        return isOwnRom && finding.source === ROM_SOURCE.nv && written.source !== ROM_SOURCE.nv ? ROM_DECISION.confirm : ROM_DECISION.nothing;
    }
    if (!isOwnRom) return ROM_DECISION.disagree;
    if (finding.source === ROM_SOURCE.script && written.source === ROM_SOURCE.nv) return ROM_DECISION.nothing;
    return ROM_DECISION.write;
}

export function createTableRomRecord(host, store) {
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    const saved = store.readCabinetFile(RECORD_NAME);
    const data = isRecord(saved) && isRecord(saved.tables) ? saved : { version: RECORD_VERSION, tables: {} };

    const entryOf = (configId) => {
        if (!isRecord(data.tables[configId])) data.tables[configId] = {};
        return data.tables[configId];
    };
    // The table's entry, without creating it: none when nothing is recorded.
    const existingEntry = configId => (isRecord(data.tables[configId]) ? data.tables[configId] : {});
    const save = () => store.saveCabinetFile(RECORD_NAME, data);

    function applyFinding(configId, finding) {
        const game = host.getGameInfo(configId);
        if (!game) return;
        const { written } = existingEntry(configId);
        const currentRom = game.rom;
        const decision = decideRomWrite(currentRom, written, finding);
        if (decision === ROM_DECISION.confirm) {
            // Nothing to write, but no later script read may replace it now.
            entryOf(configId).written = { rom: written.rom, source: ROM_SOURCE.nv };
        } else if (decision === ROM_DECISION.write) {
            game.update({ rom: finding.rom });
            entryOf(configId).written = { rom: finding.rom, source: finding.source };
            const was = isEmptyRom(currentRom) ? "was empty" : `was "${currentRom}"`;
            log(`"${configId}": ROM "${finding.rom}" written (${was}; source: ${finding.source}).`);
        } else if (decision === ROM_DECISION.disagree) {
            const from = finding.source === ROM_SOURCE.script ? "the script gives" : "the .nv gives";
            log(`"${configId}": hand-typed ROM "${currentRom}" kept; ${from} "${finding.rom}".`);
        }
    }

    return {
        // Whether the table's script must be read: never read, or its game
        // file or .vbs changed since; after a failure, only once one of them
        // or vpxtool.exe changed (state: { vpx, vbs, vpxtool }, each
        // { modified, size } or null).
        needsScriptRead: (configId, state) => {
            const { script, scriptFailure } = existingEntry(configId);
            const sameTable = seen => isRecord(seen) && sameFileState(seen.vpx, state.vpx) && sameFileState(seen.vbs, state.vbs);
            if (sameTable(script)) return false;
            return !(sameTable(scriptFailure) && sameFileState(scriptFailure.vpxtool, state.vpxtool));
        },
        // Remembers a failure that comes from the table's files, not from a busy cabinet.
        applyScriptFailure: (configId, state) => {
            entryOf(configId).scriptFailure = { vpx: state.vpx, vbs: state.vbs, vpxtool: state.vpxtool };
            save();
        },
        // Remembers what the table's script gave (rom null: no ROM) and
        // applies it to PinballY's ROM field.
        applyScriptRead: (configId, state, rom) => {
            const entry = entryOf(configId);
            entry.script = { vpx: state.vpx, vbs: state.vbs, rom };
            delete entry.scriptFailure;
            if (rom !== null) applyFinding(configId, { rom, source: ROM_SOURCE.script });
            // A ROM a .nv confirmed makes it a ROM table whatever its script says.
            else if (!(entry.written && entry.written.source === ROM_SOURCE.nv)) log(`"${configId}": its script loads no ROM.`);
            save();
        },
        // Applies the ROM whose .nv a game wrote.
        applyNvConfirmation: (configId, rom) => {
            applyFinding(configId, { rom, source: ROM_SOURCE.nv });
            save();
        },
    };
}
