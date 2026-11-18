// ============================================================
// Play Settlement: a Play, as a subscriber of the Launch Bracket. Reads the board at
// launch (PINemHi, or VPX's User folder without a ROM) and after the game, credits the
// Play's place, then its Play Score (with vpxtool, from the ROM's .nv copied to
// play_scores\ at launch; oddities to play_scores_anomalies.log), and announces at most
// one of them. Hands PinballY a learned board; also reads it for the High Score Board.
// - The Play and the NVRAM watch's news are read after the board read, never at the launch's end.
// - A ROM-less table learns its source for good: the one board the Play changed.
// - Logs under the caller's script name; texts come from the caller (no i18n here).
// ============================================================

import { safeHandler, logHandlerError } from "../core/safe_handler.js";
import { logError } from "../core/error_log.js";
import { nvramFolderOf } from "../vpxtool/nvram_watch.js";
import { readBoard } from "./board_reader.js";
import { readCompoundFile } from "./compound_file_reader.js";
import { readSectionBoard, readTextBoard } from "./romless_board_reader.js";
import { readNvramAnswer, lastGameOf, playScoreOf } from "./last_game_reader.js";
import { createPlayScoreAnomalyLog, valueAnomaliesOf, ANOMALY } from "./play_score_anomaly_log.js";

// PinballY's own read after the game returns the board cached at launch
// (seen on the cabinet): read again a little later, fresh.
const AFTER_READ_DELAY_MS = 2000;
// PinballY kills PINemHi after 7.5 s; a read may also wait behind another one.
const READ_TIMEOUT_MS = 10000;
// The pack's folder for the .nv copied at launch, one per ROM.
const PLAY_SCORE_COPY_FOLDER = "play_scores";
// Unfinished Plays in a row on a ROM that make an anomaly: the sign of a
// game_over that never turns true.
const UNFINISHED_PLAYS_IN_A_ROW = 3;

const messageOf = error => (error instanceof Error ? error.message : String(error));

// The Smurf tables write plain ASCII: one character per byte, decoded a
// slice at a time so a large file never passes too many arguments.
const asciiOf = (bytes) => {
    let text = "";
    for (let at = 0; at < bytes.length; at += 4096) text += String.fromCharCode(...bytes.subarray(at, at + 4096));
    return text;
};

// Two snapshots' values of a section are the same, in any order.
const sameValues = (a, b) => {
    if (!a || !b) return a === b;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
};

// The source's board in a snapshot ({ kind: "vpreg", section } or
// { kind: "text", file }), or null.
function boardIn(snapshot, source) {
    if (source.kind === "text") return source.file in snapshot.texts ? readTextBoard(snapshot.texts[source.file]) : null;
    return snapshot.sections && snapshot.sections[source.section] ? readSectionBoard(snapshot.sections[source.section]) : null;
}

const describe = source => (source.kind === "text" ? `text file "${source.file}"` : `VPReg.stg section "${source.section}"`);
const nameOf = source => (source.kind === "text" ? source.file : source.section);
const bothReadVpreg = (before, after) => Boolean(before.sections && after.sections);

// The sources whose board the Play changed, both snapshots holding VPReg.stg.
function changedSources(before, after) {
    const sections = Object.keys(after.sections).filter(name => !sameValues(before.sections[name], after.sections[name])).map(section => ({ kind: "vpreg", section }));
    const texts = Object.keys(after.texts).filter(file => before.texts[file] !== after.texts[file]).map(file => ({ kind: "text", file }));
    return [...sections, ...texts].filter(source => boardIn(after, source) !== null);
}

// Among the changed boards, the table's: the only one, or of a section and
// a text file, the one with more places (La Schtroumpfette's five-place
// file over its lone HighScore); null otherwise.
function tableSourceAmong(changed, after) {
    if (changed.length === 1) return changed[0];
    if (changed.length !== 2 || changed[0].kind === changed[1].kind) return null;
    const [a, b] = changed.map(source => boardIn(after, source).length);
    return a === b ? null : changed[a > b ? 0 : 1];
}

// Why the .nv files the game changed give no Play Score, or null when the
// game changed the table's .nv alone.
function whyChangedNvGiveNone(rom, changed) {
    if (changed.length === 0) return `${rom}.nv did not change during the game`;
    if (changed.length > 1) return `${changed.length} .nv files changed during the game (${changed.join(", ")})`;
    if (changed[0].toLowerCase() !== rom.toLowerCase()) return `${changed[0]}.nv changed during the game, not the table's ${rom}.nv`;
    return null;
}

// announce({ configId, place }) for the best place a Play won, else
// announce({ configId, record, score }) for its Play Score's House Record or
// Personal Best (recordPlayScore's record); at most one per Play.
export function createPlaySettlement(host, {
    highScores, launchBracket, profileStore, nvramWatch, vpxtool, scriptName, scoreText, announce,
}) {
    const log = text => host.log(`[${scriptName}] ${text}`);
    const wait = ms => new Promise(resolve => host.setTimeout(resolve, ms));
    const tellAnnounce = safeHandler(scriptName, announce);
    const anomalies = createPlayScoreAnomalyLog(host, scriptName);
    // The last launch, kept past its end until the next one: { configId,
    // launchRead (a promise), snapshot (the User folder at launch), nvCopy,
    // nvChanged (the ROMs whose .nv the game changed, once the NVRAM watch
    // told), play (the Play the Profile store announced, once it did) }.
    let lastLaunch = null;

    nvramWatch.watch(scriptName, {
        onGameEnded: ({ configId, changed }) => {
            if (lastLaunch && lastLaunch.configId === configId) lastLaunch.nvChanged = changed;
        },
    });
    profileStore.onPlay(safeHandler(scriptName, (play) => {
        if (lastLaunch && lastLaunch.configId === play.configId) lastLaunch.play = play;
    }));

    // PinballY reads no board for a table with a learned source: its DMD
    // and info box show the one handed to it, kept until the next launch
    // or forgetting read. A ROM table PINemHi reads never learns one.
    function handToPinballY(configId) {
        const known = highScores.boardOf(configId);
        const game = host.getGameInfo(configId);
        if (!highScores.sourceOf(configId) || known === null || !game) return;
        game.setHighScores(known.map(place => [`${place.rank})`, place.initials, scoreText(place.score)].filter(Boolean).join(" ")));
    }
    // A learned source is kept for good: a ROM table's ROM, read by
    // PINemHi since, must not be hidden behind a stale board.
    for (const configId of highScores.learnedTables()) {
        const game = host.getGameInfo(configId);
        if (game && !game.rom) safeHandler(scriptName, handToPinballY)(configId);
    }

    // The table's board, read by PINemHi without PinballY's cache when
    // forget is set: { status: "read", places }, or { status } "unsupported"
    // or "failed" (failed, timed out), logged.
    function readTable(configId, { forget = false } = {}) {
        return new Promise((resolve) => {
            const game = host.getGameInfo(configId);
            if (!game) {
                resolve({ status: "failed" });
                return;
            }
            let finished = false;
            const finish = (result) => {
                if (finished) return;
                finished = true;
                host.clearTimeout(timer);
                resolve(result);
            };
            const timer = host.setTimeout(safeHandler(scriptName, () => {
                log(`"${configId}": the high scores read timed out.`);
                finish({ status: "failed" });
            }), READ_TIMEOUT_MS);
            if (forget) game.setHighScores(null);
            game.getHighScores().then((lines) => {
                // Settled at once even when reading the lines throws, so no "timed out" follows.
                try {
                    const board = readBoard(lines);
                    if (board.status === "unsupported") log(`"${configId}": PINemHi does not support its ROM.`);
                    finish(board.status === "unsupported" ? { status: "unsupported" } : { status: "read", places: board.places });
                } catch (error) {
                    finish({ status: "failed" });
                    logHandlerError(scriptName, error);
                }
            }, safeHandler(scriptName, (error) => {
                // PinballY reads no board for a table without a ROM: no news there.
                if (game.rom) log(`"${configId}": the high scores read failed (${messageOf(error)}).`);
                finish({ status: "failed" });
            }));
        });
    }

    // The table's board places, or null when the read did not give a board.
    const readPlaces = (configId, options) => readTable(configId, options)
        .then(result => (result.status === "read" ? result.places : null));

    // VPX keeps VPReg.stg and the tables' text files in the User folder
    // beside its executable (VPinballX.exe, VPinballX64.exe,
    // VPinballX_GL64.exe...); null for a table of another system, such as
    // Future Pinball.
    function userFolderOf(configId) {
        const game = host.getGameInfo(configId);
        const exe = game && game.system ? String(game.system.exe || "") : "";
        const folderEnd = exe.lastIndexOf("\\");
        if (folderEnd === -1 || !/^vpinballx/i.test(exe.slice(folderEnd + 1))) return null;
        return `${exe.slice(0, folderEnd)}\\User`;
    }

    // The text of every .txt of the User folder, by file name; a file gone
    // between the listing and its read is left out, a folder that cannot
    // be listed gives none (both logged).
    function readTextFiles(configId, folder) {
        let names;
        try {
            names = host.files.listFiles(folder).filter(file => /\.txt$/i.test(file));
        } catch (error) {
            log(`"${configId}": ${folder} could not be listed (${messageOf(error)}); no text file in the snapshot.`);
            return {};
        }
        const texts = {};
        for (const name of names) {
            try {
                texts[name] = asciiOf(host.files.readBytes(`${folder}\\${name}`));
            } catch (error) {
                log(`"${configId}": ${folder}\\${name} could not be read (${messageOf(error)}); left out of the snapshot.`);
            }
        }
        return texts;
    }

    // VPReg.stg's sections ({ sections }), or { error, logged? }.
    function readVpreg(configId, path) {
        if (!host.files.fileExists(path)) return { error: `${path} not found` };
        try {
            return { sections: readCompoundFile(host.files.readBytes(path)) };
        } catch (error) {
            log(`"${configId}": ${path} could not be read (${messageOf(error)}); nothing credited from it.`);
            return { error: messageOf(error), logged: true };
        }
    }

    // The User folder read whole: { sections, texts, ms }, sections
    // replaced by { error } when VPReg.stg is not read (error null for a
    // table of another system). A missing VPReg.stg is logged only when the
    // board is needed, since a ROM table's PINemHi board never consults it;
    // a file that cannot be read is logged at once ({ logged: true }).
    // After the game, the launch snapshot is passed: when its VPReg.stg
    // read failed, the second one would be useless and is not made.
    function takeSnapshot(configId, launch = null) {
        const folder = userFolderOf(configId);
        if (folder === null) return { error: null, texts: {}, ms: 0 };
        const start = host.now().getTime();
        const texts = readTextFiles(configId, folder);
        const vpreg = launch && !launch.sections ? { error: launch.error, logged: launch.logged } : readVpreg(configId, `${folder}\\VPReg.stg`);
        return { ...vpreg, texts, ms: host.now().getTime() - start };
    }

    // The User folder's failed VPReg.stg read, logged once.
    function logFailedRead(configId, before, after) {
        const failed = [before, after].find(snapshot => !snapshot.sections);
        if (failed && failed.logged) return;
        const why = failed && failed.error !== null ? ` (VPReg.stg: ${failed.error})` : "";
        log(`"${configId}": no board after the game; nothing credited, the last known board kept${why}.`);
    }

    // The table's learned source ({ source, isNew: false }), or the one
    // board the Play changed, learned now ({ source, isNew: true }); null
    // when there is none (logged).
    function sourceOf(configId, before, after) {
        const learned = highScores.sourceOf(configId);
        if (learned) return { source: learned, isNew: false };
        // A section changed alongside a text file could not be seen.
        if (!bothReadVpreg(before, after)) {
            logFailedRead(configId, before, after);
            return null;
        }
        const changed = changedSources(before, after);
        const source = tableSourceAmong(changed, after);
        if (source === null) {
            log(changed.length === 0
                ? `"${configId}": no board after the game, and no VPReg.stg or text file board changed; nothing learned, nothing credited.`
                : `"${configId}": no board after the game, and ${changed.length} boards changed (${changed.map(nameOf).join(", ")}); nothing learned, nothing credited.`);
            return null;
        }
        highScores.learnSource(configId, source);
        return { source, isNew: true };
    }

    // The table's ROM-less boards around the Play: { before, after },
    // before null when its source did not exist yet; null when there is no
    // board after the game (logged).
    function romlessBoards(configId, before, after) {
        const found = sourceOf(configId, before, after);
        if (found === null) return null;
        const { source } = found;
        if (source.kind === "vpreg" && !bothReadVpreg(before, after)) {
            logFailedRead(configId, before, after);
            return null;
        }
        const timing = `User folder read in ${before.ms} ms before the game, ${after.ms} ms after`;
        log(found.isNew ? `"${configId}": ${describe(source)} learned (${timing}).` : `"${configId}": board read from ${describe(source)} (${timing}).`);
        const afterBoard = boardIn(after, source);
        if (afterBoard === null) {
            log(`"${configId}": no board in ${describe(source)} after the game; nothing credited, the last known board kept.`);
            return null;
        }
        return { before: boardIn(before, source), after: afterBoard };
    }

    // The High Score Board's read when PINemHi gives no board: the learned
    // section or file read now ({ status: "read", places } or "failed"),
    // "notLearned" for a VPX table with nothing learned yet, else
    // PINemHi's result as it is; logged: true when the outcome was logged.
    function romlessRead(configId, pinemhiRead) {
        const source = highScores.sourceOf(configId);
        if (!source) {
            const game = host.getGameInfo(configId);
            if (!game || game.rom || userFolderOf(configId) === null) return pinemhiRead;
            log(`"${configId}": no board for the High Score Board; no VPReg.stg section or text file learned yet.`);
            return { status: "notLearned", logged: true };
        }
        const snapshot = takeSnapshot(configId);
        const places = boardIn(snapshot, source);
        if (places !== null) {
            log(`"${configId}": board read from ${describe(source)} for the High Score Board (User folder read in ${snapshot.ms} ms).`);
            return { status: "read", places };
        }
        // A VPReg.stg that could not be read was logged by the snapshot.
        if (!(source.kind === "vpreg" && snapshot.logged)) {
            const why = source.kind === "vpreg" && snapshot.error ? ` (VPReg.stg: ${snapshot.error})` : "";
            log(`"${configId}": no board in ${describe(source)} for the High Score Board${why}; ${highScores.boardOf(configId) === null ? "none known yet" : "the last known board kept"}.`);
        }
        return { status: "failed", logged: true };
    }

    // The High Score Board's read, by config ID while it runs, so a second
    // opening reuses it.
    const boardReads = new Map();

    // A fresh read for the High Score Board, recorded as a board read
    // outside a Play: resolves to its status ("read", "unsupported",
    // "failed", or "notLearned" for a table without a ROM whose source is
    // not learned yet) once the store holds it (after a Play being settled
    // on the table, if any), whether the screen is still open or not. When
    // PINemHi gives no board, the learned section or file is read now: the
    // board sits over the wheel, so VPX does not run.
    function refreshBoard(configId) {
        if (boardReads.has(configId)) return boardReads.get(configId);
        const read = readTable(configId, { forget: true }).then(safeHandler(scriptName, async (pinemhiRead) => {
            try {
                const result = pinemhiRead.status === "read" ? pinemhiRead : romlessRead(configId, pinemhiRead);
                if (result.status === "read") await highScores.recordBoard(configId, result.places);
                else if (!result.logged) log(`"${configId}": no board for the High Score Board; ${highScores.boardOf(configId) === null ? "none known yet" : "the last known board kept"}.`);
                return result.status;
            } finally {
                boardReads.delete(configId);
                // The read made PinballY forget the board: handed again,
                // the last known one when nothing was read.
                if (pinemhiRead.status !== "read") handToPinballY(configId);
            }
        })).then(status => status, () => "failed");
        boardReads.set(configId, read);
        return read;
    }

    // The board read after the game, settled against the last known one:
    // { best, places }, the best place credited and the board read (each
    // or null). The Play is read here, past the wait, whenever it came.
    async function settleBoard(launch) {
        const { configId } = launch;
        await launch.launchRead;
        await wait(AFTER_READ_DELAY_MS);
        const places = await readPlaces(configId, { forget: true });
        if (places !== null) return { best: highScores.settlePlay(configId, places, launch.play), places };
        try {
            const after = takeSnapshot(configId, launch.snapshot);
            const boards = romlessBoards(configId, launch.snapshot, after);
            if (boards === null) return { best: null, places: null };
            if (boards.before !== null) highScores.recordBoardBeforePlay(configId, boards.before);
            return { best: highScores.settlePlay(configId, boards.after, launch.play), places: boards.after };
        } finally {
            // The launch made PinballY forget the board: handed again, the
            // last known one (just credited) when nothing was read.
            handToPinballY(configId);
        }
    }

    // The ROM's .nv copied before VPinMAME writes it, under the ROM's name
    // (vpxtool picks the map from it), replacing the copy of an earlier
    // launch, even one PinballY never brought back: { rom, nvPath, copyPath },
    // { none: why, onlyIfNvChanged } when there is nothing to read (why null
    // once logged), or null without vpxtool.
    function copyNv(game) {
        if (!vpxtool.hasVpxtool()) return null;
        // Every table without ROM lands here too: the reason is logged only
        // when the game changed a .nv, a sign the table does run a ROM.
        if (!game.rom) return { none: "the table's ROM was unknown at launch", onlyIfNvChanged: true };
        const folder = nvramFolderOf(host, game);
        if (folder === null) return { none: "no NVRAM folder is known" };
        const nvPath = `${folder}\\${game.rom}.nv`;
        if (!host.files.fileExists(nvPath)) return { none: `${nvPath} did not exist at launch` };
        const copyFolder = `${host.getProjectFolder()}\\${PLAY_SCORE_COPY_FOLDER}`;
        const copyPath = `${copyFolder}\\${game.rom}.nv`;
        try {
            host.files.createFolder(copyFolder);
            host.files.copyFile(nvPath, copyPath);
        } catch (error) {
            logError(scriptName, `ERROR "${game.configId}": ${nvPath} could not be copied (${messageOf(error)}); no Play Score.`, host, error);
            return { none: null };
        }
        return { rom: game.rom, nvPath, copyPath };
    }

    // A Play Score side that throws (logged) must not cost the Play its place.
    function guardedCopyNv(game) {
        try {
            return copyNv(game);
        } catch (error) {
            logHandlerError(scriptName, error);
            return { none: null };
        }
    }

    // vpxtool's answer for the .nv (readNvramAnswer()'s), or undefined when
    // it gave none (logged, as an error unless it has no map for the ROM;
    // no map and an unreadable answer go to the anomaly log, with the
    // answer read before, if any).
    function readAnswerIn(configId, rom, path, answerBefore) {
        return new Promise((resolve) => {
            const giveUp = (why) => {
                logError(scriptName, `ERROR "${configId}": ${path} not read by vpxtool (${why}); no Play Score.`, host);
                resolve(undefined);
            };
            const anomaly = check => anomalies.write({ configId, rom, check, before: answerBefore });
            vpxtool.submit({
                scriptName,
                args: ["nvram", "show", path],
                apply: ({ exitCode, output }) => {
                    // vpxtool's answer for a ROM it has no map of (31 of the
                    // cabinet's 142 .nv): an unsupported table, not an error.
                    if (exitCode !== 0) {
                        log(`"${configId}": vpxtool reads no last game in ${path} (exit code ${exitCode}, no map for this ROM); no Play Score.`);
                        anomaly(ANOMALY.NO_MAP);
                        resolve(undefined);
                        return;
                    }
                    try {
                        resolve(readNvramAnswer(output));
                    } catch (error) {
                        anomaly(ANOMALY.UNREADABLE_ANSWER);
                        giveUp(messageOf(error));
                    }
                },
                fail: giveUp,
            });
        });
    }

    // After the board settled the Play: its Play Score, when the game
    // changed only the table's own .nv; why not logged otherwise, silently
    // for a launch shorter than a Play. placeWon: the place stands for the
    // Play, so its Play Score announces nothing. boardAfter: the board
    // places read after the game, or null.
    async function settlePlayScore(launch, placeWon, boardAfter) {
        const { configId, nvCopy: copy, nvChanged: changed, play } = launch;
        if (copy === null || play === null) return;
        const noPlayScore = why => log(`"${configId}": no Play Score for ${play.profileName}: ${why}.`);
        if (copy.none !== undefined) {
            const told = copy.none !== null && (!copy.onlyIfNvChanged || changed.length > 0);
            if (told) noPlayScore(copy.none);
            return;
        }
        const why = whyChangedNvGiveNone(copy.rom, changed);
        if (why !== null) {
            noPlayScore(why);
            return;
        }
        // One after the other: a vpxtool that fails on the copy is not run again.
        const before = await readAnswerIn(configId, copy.rom, copy.copyPath, null);
        if (before === undefined) return;
        const after = await readAnswerIn(configId, copy.rom, copy.nvPath, before);
        if (after === undefined) return;
        const anomaly = (check, detail) => anomalies.write({ configId, rom: copy.rom, check, detail, before, after });
        for (const { check, detail } of valueAnomaliesOf(before, after)) anomaly(check, detail);
        const result = playScoreOf(lastGameOf(before.gameState), lastGameOf(after.gameState));
        if (result.none) {
            noPlayScore(result.none);
            if (!result.unfinished) return;
            const inARow = highScores.countUnfinishedPlay(copy.rom);
            if (inARow === UNFINISHED_PLAYS_IN_A_ROW) anomaly(ANOMALY.UNFINISHED_IN_A_ROW, `${inARow} Plays in a row`);
            return;
        }
        highScores.clearUnfinishedPlays(copy.rom);
        const lowestPlace = boardAfter === null || boardAfter.length === 0 ? null : Math.min(...boardAfter.map(place => Number(place.score)));
        if (!placeWon && lowestPlace !== null && result.score > lowestPlace) {
            anomaly(ANOMALY.SHOULD_HAVE_ENTERED_BOARD, `Play Score ${result.score}, lowest place ${lowestPlace}`);
        }
        const record = highScores.recordPlayScore(configId, play, result.score);
        if (record !== null && !placeWon) tellAnnounce({ configId, record, score: result.score });
    }

    // The board, then the Play Score; the board stays held until both are
    // settled. A board settle that failed (logged) may have won a place,
    // so the Play Score then announces nothing.
    function settle(launch) {
        const { configId } = launch;
        const release = highScores.holdBoardForPlay(configId);
        const settlePlayScoreSafely = (placeWon, places) => safeHandler(scriptName, settlePlayScore)(launch, placeWon, places);
        const settleAndAnnounce = () => settleBoard(launch).then(({ best, places }) => {
            if (best) tellAnnounce({ configId, place: best });
            return { placeWon: Boolean(best), places };
        });
        safeHandler(scriptName, settleAndAnnounce)()
            .then(({ placeWon, places }) => settlePlayScoreSafely(placeWon, places), () => settlePlayScoreSafely(true, null))
            .then(release, release);
    }

    launchBracket.subscribe(scriptName, {
        // At "prelaunch": PinballY just cleared its cached board.
        onBegan: ({ game }) => {
            // Should the snapshot throw, the earlier launch's Play and news must not land on this one.
            lastLaunch = null;
            const { configId } = game;
            const launchRead = readPlaces(configId).then(safeHandler(scriptName, (places) => {
                if (places !== null) highScores.recordBoard(configId, places);
            }));
            // Read at once, before VPX starts and holds the files.
            const snapshot = takeSnapshot(configId);
            lastLaunch = { configId, launchRead, snapshot, nvCopy: guardedCopyNv(game), nvChanged: [], play: null };
        },
        // A launch a later script cancelled ran no game.
        onEnded: ({ cancelled }) => {
            if (lastLaunch && !cancelled) settle(lastLaunch);
        },
    });

    return { refreshBoard };
}
