// ============================================================
// Pending ROM writer of the Table ROMs Add-on: writes a ROM its script read
// left pending only while the wheel moves or hides, as every update()
// refreshes the wheel: on leaving a table the player stayed on for DWELL_MS
// (next "gameselect"), or at the latest when the table launches (Launch Bracket).
// - Never at the dwell's end: the wheel is still and the player would see it flash.
// - Attract mode (its own "gameselect" included) writes nothing and cancels a dwell.
// - A "gameselect" fired by the write itself is no new selection (to check on the cabinet).
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { logInfo } from "../core/info_log.js";
import { isInAttractMode, onAttractModeStarted } from "../core/attract_mode.js";
import { SCRIPT_NAME } from "./table_rom_record.js";

export const DWELL_MS = 2000;

export function createPendingRomWriter(host, record, launchBracket) {
    // The table selected with a pending ROM: { configId, dwelt, timer }.
    let dwell = null;
    let writing = false;

    function cancelDwell() {
        if (dwell) host.clearTimeout(dwell.timer);
        dwell = null;
    }

    function write(configId, when) {
        writing = true;
        let rom;
        try {
            rom = record.writePending(configId);
        } finally {
            writing = false;
        }
        if (rom !== null) logInfo(SCRIPT_NAME, `"${configId}": pending ROM "${rom}" written ${when}.`, host);
    }

    // The player's moves and PinballY's own attract switches.
    host.onGameListEvent("gameselect", safeHandler(SCRIPT_NAME, (ev) => {
        // Fired by our own update(): the wheel did not move.
        if (writing) {
            logInfo(SCRIPT_NAME, `A ROM write fired "gameselect" (${ev.game ? `"${ev.game.configId}"` : "no table"}); not taken as a selection.`, host);
            return;
        }
        if (isInAttractMode(host)) {
            cancelDwell();
            return;
        }
        const game = ev.game;
        if (dwell && game && dwell.configId === game.configId) return;
        const leftDwell = dwell;
        cancelDwell();
        if (leftDwell && leftDwell.dwelt) write(leftDwell.configId, "on leaving the table");
        if (!game || record.pendingRom(game.configId) === null) return;
        const started = { configId: game.configId, dwelt: false, timer: null };
        started.timer = host.setTimeout(safeHandler(SCRIPT_NAME, () => { started.dwelt = true; }), DWELL_MS);
        dwell = started;
    }));
    onAttractModeStarted(host, SCRIPT_NAME, cancelDwell);
    // Subscribed before the High Scores Add-on: its launch reads the ROM written here.
    launchBracket.subscribe(SCRIPT_NAME, {
        onBegan: ({ game }) => {
            cancelDwell();
            write(game.configId, "at launch");
        },
    });
}
