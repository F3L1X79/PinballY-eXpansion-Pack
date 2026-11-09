// ============================================================
// Quiet wheel: while a screen dims the wheel (the startup veil, the Profile
// picker, the Welcome Screen), the selected table's own audioVolume is brought
// down to its ceiling (50 unless the hold gives one, 0 silences it); it comes
// back when the last of them closes, at once if a launch, a menu or attract
// mode cuts the hand-over (docs/adr/0015). A pending file keeps the original.
// - restoreLeftover() runs from main.js before any hold: a crash leaves the file.
// - One update() each way unless a release asks for a climb: each one flashes the wheel.
// - The return finds the table by config ID: the selection may have moved since.
// ============================================================

import { safeHandler } from "./safe_handler.js";
import { logError } from "./error_log.js";
import { createPinballYHost } from "./pinbally_host.js";

const SCRIPT_NAME = "QuietWheel";
// Half the recorded level, for a hold with no ceiling of its own; a table set
// at or below its ceiling is left alone.
const QUIET_CEILING = 50;
// A screen that follows another holds the wheel again within this delay:
// no rise between them.
const HANDOVER_MS = 150;
// In the project folder while a table is lowered, for the startup restore.
const PENDING_FILE_NAME = "quiet_wheel_pending.json";

// hold() and release() are safe to call again with the same name.
export function createQuietWheel(host) {
    // Names of the screens dimming the wheel.
    const holders = new Set();
    // { configId, title, original, quiet } while a table is lowered, else null.
    let loweredTable = null;
    let handoverTimer = null;
    // Running while a released table climbs back in steps.
    let climbTimer = null;
    const pendingFile = `${host.getProjectFolder()}\\${PENDING_FILE_NAME}`;

    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);

    function clearHandover() {
        host.clearTimeout(handoverTimer);
        handoverTimer = null;
    }

    function clearClimb() {
        if (climbTimer !== null) host.clearInterval(climbTimer);
        climbTimer = null;
    }

    // A table already lowered only goes further down, for a stricter hold; it
    // comes back up when the last hold ends.
    function lower(ceiling) {
        if (loweredTable && ceiling >= loweredTable.quiet) return;
        const game = loweredTable ? host.getGameInfo(loweredTable.configId) : host.getCurrentTable();
        if (!game) {
            log("No table selected, nothing lowered.");
            return;
        }
        const current = loweredTable
            || { configId: game.configId, title: game.title, original: game.audioVolume, quiet: game.audioVolume };
        const quiet = Math.min(current.quiet, ceiling);
        if (quiet === current.quiet) {
            // Kept even when untouched: a stricter hold finds the original here.
            loweredTable = current;
            log(`Left "${game.title}" at ${quiet}, already quiet.`);
            return;
        }
        const table = { ...current, quiet };
        // Written before the drop: a write that fails leaves the table untouched.
        host.files.writeText(pendingFile, JSON.stringify(table));
        loweredTable = table;
        game.update({ audioVolume: quiet });
        log(`Lowered "${game.title}" from ${current.quiet} to ${quiet} (${[...holders].join(", ")}).`);
    }

    // Writes the original volume back, then deletes the pending file; a
    // table gone from the game list is only logged.
    function putBackOriginal({ configId, title, original, quiet }, why) {
        const game = host.getGameInfo(configId);
        if (game) {
            game.update({ audioVolume: original });
            log(`Restored "${title}" from ${quiet} to ${original} (${why}).`);
        } else {
            log(`"${title}" (${configId}) is no longer in the game list, its volume left at ${quiet}.`);
        }
        host.files.deleteFile(pendingFile);
    }

    function restore(why) {
        clearHandover();
        clearClimb();
        if (!loweredTable) return;
        const table = loweredTable;
        loweredTable = null;
        if (table.quiet !== table.original) putBackOriginal(table, why);
    }

    // PinballY quit or crashed while a table was lowered: its pending file is
    // still there. An unreadable one (cut short by the crash) is deleted.
    function restoreLeftover() {
        if (!host.files.fileExists(pendingFile)) return;
        let table;
        try {
            table = JSON.parse(host.files.readText(pendingFile));
        } catch (error) {
            logError(SCRIPT_NAME, `ERROR reading ${PENDING_FILE_NAME}, deleted: ${error.message}`, host, error);
            host.files.deleteFile(pendingFile);
            return;
        }
        putBackOriginal(table, "left by the last session");
    }

    // Back to the original in equal time steps along (step / steps) ^ exponent.
    // restore() writes the last step, so the pending file outlives the climb.
    function startClimb(name, { durationMs, steps, exponent }) {
        const table = loweredTable;
        if (!table || table.quiet === table.original) {
            restore(`${name} closed`);
            return;
        }
        let step = 0;
        climbTimer = host.setInterval(safeHandler(SCRIPT_NAME, () => {
            step++;
            if (step >= steps) {
                restore(`${name} closed, climb over`);
                return;
            }
            const game = host.getGameInfo(table.configId);
            if (game) game.update({ audioVolume: Math.round(table.quiet + (table.original - table.quiet) * (step / steps) ** exponent) });
        }), durationMs / steps);
    }

    // ceiling: the most the table may play at during this hold, 0 to silence it.
    function hold(name, { ceiling = QUIET_CEILING } = {}) {
        if (climbTimer !== null) restore(`${name} held during the climb`);
        clearHandover();
        holders.add(name);
        lower(ceiling);
    }

    // atOnce: no hand-over, for a screen that closes with nothing to follow
    // it (a launch, a wheel move, a menu): the table is back at once.
    // climb: { durationMs, steps, exponent }, to bring it back in steps instead.
    function release(name, { atOnce = false, climb = null } = {}) {
        if (!holders.delete(name) || holders.size > 0) return;
        if (climb) {
            startClimb(name, climb);
            return;
        }
        if (atOnce) {
            restore(`${name} closed`);
            return;
        }
        clearHandover();
        handoverTimer = host.setTimeout(safeHandler(SCRIPT_NAME, () => {
            handoverTimer = null;
            if (holders.size === 0) restore(`${name} closed`);
        }), HANDOVER_MS);
    }

    // Fire when a table starts launching, a menu opens or the cabinet sits
    // idle: no screen follows any more, so a hand-over ends at once.
    const endHandover = safeHandler(SCRIPT_NAME, ev => {
        if (handoverTimer !== null) restore(`${ev.type} in the hand-over`);
    });
    for (const type of ["launchoverlayshow", "menuopen", "attractmodestart"]) host.on(type, endHandover);

    // Fires at a launch or attract mode; not at a menu, a climb can run under one.
    const endClimb = safeHandler(SCRIPT_NAME, ev => {
        if (climbTimer !== null) restore(`${ev.type} during the climb`);
    });
    for (const type of ["launchoverlayshow", "attractmodestart"]) host.on(type, endClimb);

    return {
        restoreLeftover: safeHandler(SCRIPT_NAME, restoreLeftover),
        hold: safeHandler(SCRIPT_NAME, hold),
        release: safeHandler(SCRIPT_NAME, release),
    };
}

let sharedQuietWheel = null;

export function getQuietWheel() {
    if (!sharedQuietWheel) sharedQuietWheel = createQuietWheel(createPinballYHost());
    return sharedQuietWheel;
}
