// ============================================================
// Play Score anomaly log: play_scores_anomalies.log in the logs folder, one
// line per oddity of the Play Score rules (the checks of ANOMALY), with the
// game state read before and after the game, for the owner to send with a
// report. Once per start, a file over 100 KB becomes the .old.log first.
// - Never throws: a write failure is one logfile.log line per session.
// - The checks of ONCE_PER_SESSION are written once per ROM and check per session.
// ============================================================

import { appendToLog, prepareLogFile, timestampOf } from "../core/dated_log_file.js";
import { valueOf } from "./last_game_reader.js";

const LOG_FILE = { name: "play_scores_anomalies.log", oldName: "play_scores_anomalies.old.log", rotationBytes: 100 * 1024 };
// The _fileformat values seen on the cabinet.
const KNOWN_FILE_FORMATS = [0.7, 0.8];

export const ANOMALY = Object.freeze({
    UNFINISHED_IN_A_ROW: "unfinishedInARow",
    SHOULD_HAVE_ENTERED_BOARD: "shouldHaveEnteredBoard",
    NO_MAP: "noMap",
    UNKNOWN_FORMAT: "unknownFormat",
    IMPOSSIBLE_VALUES: "impossibleValues",
    FINAL_SCORES_ONLY: "finalScoresOnly",
    UNREADABLE_ANSWER: "unreadableAnswer",
});
const ONCE_PER_SESSION = new Set([ANOMALY.NO_MAP, ANOMALY.UNKNOWN_FORMAT, ANOMALY.IMPOSSIBLE_VALUES, ANOMALY.FINAL_SCORES_ONLY, ANOMALY.UNREADABLE_ANSWER]);

const COMPACT_FIELDS = ["scores", "final_scores", "player_count", "game_over"];

// The game state's fields the Play Score reads, on one line
// ("scores=[530050,0,0,0] player_count=1 game_over=true"): "?" for a value
// outside the NVRAM, an absent field left out.
export function compactGameState(gameState) {
    if (gameState === null) return "no game_state";
    const shown = field => (valueOf(field) === null ? "?" : JSON.stringify(valueOf(field)));
    return COMPACT_FIELDS.filter(name => gameState[name] !== undefined)
        .map(name => `${name}=${Array.isArray(gameState[name]) ? `[${gameState[name].map(shown).join(",")}]` : shown(gameState[name])}`)
        .join(" ");
}

// A list field's values, or null when the field is not a list.
const slotValues = list => (Array.isArray(list) ? list.map(valueOf) : null);
const isNumber = value => typeof value === "number" && Number.isFinite(value);
const unique = list => [...new Set(list)];

// What one answer's values make impossible: a player count outside 1..slots,
// a non-zero score that is not a multiple of 10.
function impossibleValuesOf(gameState) {
    if (gameState === null) return [];
    const scores = slotValues(gameState.scores) || [];
    const finalScores = slotValues(gameState.final_scores) || [];
    const slotCount = scores.length || finalScores.length;
    const playerCount = valueOf(gameState.player_count);
    const found = [];
    if (isNumber(playerCount) && slotCount > 0 && (playerCount < 1 || playerCount > slotCount)) found.push(`player_count ${playerCount} for ${slotCount} slots`);
    for (const score of [...scores, ...finalScores]) {
        if (isNumber(score) && score !== 0 && score % 10 !== 0) found.push(`score ${score}`);
    }
    return found;
}

// Scores all outside the NVRAM, while the final scores changed during the game.
function onlyFinalScoresChanged(before, after) {
    const scores = slotValues(after.scores);
    const finalAfter = slotValues(after.final_scores);
    const finalBefore = before === null ? null : slotValues(before.final_scores);
    if (scores === null || scores.length === 0 || !scores.every(score => score === null)) return false;
    if (finalAfter === null || finalBefore === null || !finalAfter.every(isNumber)) return false;
    return finalAfter.length !== finalBefore.length || finalAfter.some((score, index) => score !== finalBefore[index]);
}

// The checks on vpxtool's two answers (readNvramAnswer()'s) that fail:
// [{ check, detail }], detail "" when the check says it all.
export function valueAnomaliesOf(before, after) {
    const anomalies = [];
    const formats = unique([before, after].map(answer => answer.fileFormat).filter(format => !KNOWN_FILE_FORMATS.includes(format)));
    if (formats.length > 0) anomalies.push({ check: ANOMALY.UNKNOWN_FORMAT, detail: `_fileformat ${formats.map(String).join(", ")}` });
    const impossible = unique([...impossibleValuesOf(before.gameState), ...impossibleValuesOf(after.gameState)]);
    if (impossible.length > 0) anomalies.push({ check: ANOMALY.IMPOSSIBLE_VALUES, detail: impossible.join(", ") });
    if (after.gameState !== null && onlyFinalScoresChanged(before.gameState, after.gameState)) anomalies.push({ check: ANOMALY.FINAL_SCORES_ONLY, detail: "" });
    return anomalies;
}

// host: the PinballY host; scriptName: the writer's name in logfile.log.
export function createPlayScoreAnomalyLog(host, scriptName) {
    let prepared = false;
    let failureLogged = false;
    const written = new Set();

    const reportFailure = (error) => {
        if (failureLogged) return;
        failureLogged = true;
        host.log(`[${scriptName}] ${LOG_FILE.name} could not be written: ${error instanceof Error ? error.message : String(error)}`);
    };

    return {
        // One line: before and after are vpxtool's answers (readNvramAnswer()'s),
        // null for one not read. A ONCE_PER_SESSION check already written
        // for the ROM this session writes nothing.
        write({ configId, rom, check, detail = "", before = null, after = null }) {
            const key = `${rom.toLowerCase()}|${check}`;
            if (ONCE_PER_SESSION.has(check)) {
                if (written.has(key)) return;
                written.add(key);
            }
            const stateOf = answer => (answer === null ? "-" : compactGameState(answer.gameState));
            const line = `${timestampOf(host.now())} "${configId}" ${rom} ${check}${detail ? ` (${detail})` : ""}: ${stateOf(before)} -> ${stateOf(after)}\r\n`;
            try {
                const packFolder = host.getProjectFolder();
                if (!prepared) {
                    prepared = true;
                    // A failed preparation still lets this line try, the file maybe staying over 100 KB.
                    try {
                        prepareLogFile(host.files, packFolder, LOG_FILE);
                    } catch (error) {
                        reportFailure(error);
                    }
                }
                appendToLog(host.files, packFolder, LOG_FILE.name, line);
            } catch (error) {
                reportFailure(error);
            }
        },
    };
}
