// ============================================================
// High Scores: credits each score that entered a table's board during a Play
// to the Profile active when it started, whatever initials were typed, and
// submits a High Score Toast for the best place won. With vpxtool, keeps the
// Play Score read from the ROM's .nv, copied to play_scores\ at launch.
// Adds "High Scores" and "My High Scores" to the main menu. Rules in common/high_scores/.
// - The board is read at "prelaunch" and again a little after "postlaunch".
// - Without a ROM, the board comes from VPX's User folder, never read while VPX runs.
// - Replaces PinballY's own "High Scores": removes its entry, cancels HighScores.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { safeHandler, logHandlerError } from "../common/core/safe_handler.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getProfileRewards } from "../common/avatar_frames/profile_rewards.js";
import { readBoard } from "../common/high_scores/board_reader.js";
import { readCompoundFile } from "../common/high_scores/compound_file_reader.js";
import { readSectionBoard, readTextBoard } from "../common/high_scores/romless_board_reader.js";
import { getHighScoreStore, SCRIPT_NAME } from "../common/high_scores/high_score_store.js";
import { createHighScoreBoard } from "../common/high_scores/high_score_board.js";
import { createMyHighScores } from "../common/high_scores/my_high_scores.js";
import { getAchievementToasts, TOAST_KIND } from "../common/achievements/achievement_toast.js";
import { getMainMenu, MAIN_MENU_POSITION } from "../common/menus/main_menu.js";
import { isSeparator } from "../common/menus/menu_separator.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { getDrawnScreenControls } from "../common/core/drawn_screen_controls.js";
import { getWheelDialogs } from "../common/core/wheel_dialog.js";
import { displayNameOf } from "../common/profiles/profile_name.js";
import lang from "../common/core/i18n.js";
import { getVpxtoolRunner } from "../common/vpxtool/vpxtool_runner.js";
import { getNvramWatch, nvramFolderOf } from "../common/vpxtool/nvram_watch.js";
import { readLastGame, playScoreOf } from "../common/high_scores/last_game_reader.js";

// PinballY's own read after the game returns the board cached at launch
// (seen on the cabinet): the Add-on reads again a little later, fresh.
const AFTER_READ_DELAY_MS = 2000;
// PinballY kills PINemHi after 7.5 s; a read may also wait behind another one.
const READ_TIMEOUT_MS = 10000;
const BOARD_ENTRY = "highScoreBoard";
// The pack's folder for the .nv copied at launch, one per ROM.
const PLAY_SCORE_COPY_FOLDER = "play_scores";

export default function init() {
    const host = createPinballYHost();
    const profileStore = getProfileStore();
    const highScores = getHighScoreStore();
    const toasts = getAchievementToasts();
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    // From "prelaunch" to "postlaunch": { configId, launchRead (a promise),
    // snapshot (the User folder at launch), nvCopy, nvChanged (the ROMs
    // whose .nv the game changed, once the NVRAM watch told) }.
    let launched = null;
    // The Play the Profile store announced for the launched table, if any.
    let announcedPlay = null;
    const vpxtool = getVpxtoolRunner();
    // The last launch, kept past "postlaunch": the NVRAM watch tells it
    // within "postlaunch", before or after this Add-on's own handler.
    let watchedLaunch = null;
    getNvramWatch().watch(SCRIPT_NAME, {
        onGameEnded: ({ configId, changed }) => {
            if (watchedLaunch && watchedLaunch.configId === configId) watchedLaunch.nvChanged = changed;
        },
    });

    const board = createHighScoreBoard(host, {
        highScores, profileRewards: getProfileRewards(), drawingAhead: getDrawingAhead(), drawnScreenControls: getDrawnScreenControls(), refresh: refreshBoard,
        activeProfileName: () => profileStore.getActiveProfile().name,
    });
    const mainMenu = getMainMenu();
    mainMenu.add({
        name: BOARD_ENTRY,
        label: lang.highScores.board.menuEntry,
        position: MAIN_MENU_POSITION.HIGH_SCORE_BOARD,
        // Exit goes back one level: the main menu, on this entry.
        action: () => board.open(() => mainMenu.reopenOn(BOARD_ENTRY)),
    });
    createMyHighScores(host, { highScores, profileStore, mainMenu });
    // Drawn over the wheel without leaving its UI mode: a waiting dialog
    // shows only once the player is back on the wheel.
    getWheelDialogs().waitFor(board);

    // The board replaces PinballY's own "High Scores": its window and its
    // main menu entry, the DMD's high score text left as it is.
    const highScoresCommand = host.getBuiltInCommand("HighScores");

    // Fires when any menu opens, with a fresh item list each time; removes
    // PinballY's entry whether Menu Cleanup is on or not. The native
    // entries around it depend on the table's media: should it stand alone
    // between two separators, one of them goes with it.
    host.on("menuopen", safeHandler(SCRIPT_NAME, (ev) => {
        const at = ev.id === "main" ? ev.items.findIndex(item => item.cmd === highScoresCommand) : -1;
        if (at === -1) return;
        const items = ev.items.filter(item => item.cmd !== highScoresCommand);
        if (at > 0 && at < items.length && isSeparator(items[at - 1]) && isSeparator(items[at])) items.splice(at, 1);
        ev.items = items;
        ev.menuUpdated = true;
    }));

    // Fires on every command; the dedicated HighScores button opens the
    // board on the selected table, Exit going straight back to the wheel.
    // Cancelled in any UI mode, but opened only over the wheel: Exit could
    // not bring a menu or popup under the board back.
    host.on("command", safeHandler(SCRIPT_NAME, (ev) => {
        if (ev.id !== highScoresCommand || ev.defaultPrevented) return;
        ev.preventDefault();
        if (host.getUIMode() === "wheel") board.open();
    }));

    const wait = ms => new Promise(resolve => host.setTimeout(resolve, ms));

    // PinballY reads no board for a table with a learned source: its DMD
    // and info box show the one handed to it, kept until the next launch
    // or forgetting read. A ROM table PINemHi reads never learns one.
    function handToPinballY(configId) {
        const known = highScores.boardOf(configId);
        const game = host.getGameInfo(configId);
        if (!highScores.sourceOf(configId) || known === null || !game) return;
        const number = lang.profileStats.number;
        game.setHighScores(known.map(place => [`${place.rank})`, place.initials, number(place.score)].filter(Boolean).join(" ")));
    }
    // A learned source is kept for good: a ROM table's ROM, read by
    // PINemHi since, must not be hidden behind a stale board.
    for (const configId of highScores.learnedTables()) {
        const game = host.getGameInfo(configId);
        if (game && !game.rom) safeHandler(SCRIPT_NAME, handToPinballY)(configId);
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
            const timer = host.setTimeout(safeHandler(SCRIPT_NAME, () => {
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
                    logHandlerError(SCRIPT_NAME, error);
                }
            }, safeHandler(SCRIPT_NAME, (error) => {
                // PinballY reads no board for a table without a ROM: no news there.
                if (game.rom) log(`"${configId}": the high scores read failed (${error instanceof Error ? error.message : String(error)}).`);
                finish({ status: "failed" });
            }));
        });
    }

    // The table's board places, or null when the read did not give a board.
    const readPlaces = (configId, options) => readTable(configId, options)
        .then(result => (result.status === "read" ? result.places : null));

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
        const read = readTable(configId, { forget: true }).then(safeHandler(SCRIPT_NAME, async (pinemhiRead) => {
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

    const messageOf = error => (error instanceof Error ? error.message : String(error));

    // The Smurf tables write plain ASCII: one character per byte, decoded
    // a slice at a time so a large file never passes too many arguments.
    const asciiOf = (bytes) => {
        let text = "";
        for (let at = 0; at < bytes.length; at += 4096) text += String.fromCharCode(...bytes.subarray(at, at + 4096));
        return text;
    };

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

    // Among the changed boards, the table's: the only one, or of a section
    // and a text file, the one with more places (La Schtroumpfette's
    // five-place file over its lone HighScore); null otherwise.
    function tableSourceAmong(changed, after) {
        if (changed.length === 1) return changed[0];
        if (changed.length !== 2 || changed[0].kind === changed[1].kind) return null;
        const [a, b] = changed.map(source => boardIn(after, source).length);
        return a === b ? null : changed[a > b ? 0 : 1];
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

    // One toast per Play, for the best place won; the toast module holds
    // it until the wheel is back and the toasts before it have shown.
    function announce(configId, place) {
        const TEXT = lang.highScores;
        const game = host.getGameInfo(configId);
        const table = game ? game.title : configId;
        toasts.submit({
            kind: TOAST_KIND.HIGH_SCORE,
            tileNumber: place.rank,
            title: place.rank === 1 ? TEXT.tableRecordTitle(table) : TEXT.toastTitle(table, place.rank),
            description: TEXT.toastScore(lang.profileStats.number(place.score)),
            extraLine: place.takenFromProfile ? TEXT.takenFrom(displayNameOf(place.takenFromProfile)) : undefined,
            onShown: () => {},
        });
    }

    // Fires as a table launches: PinballY just cleared its cached board.
    host.on("prelaunch", safeHandler(SCRIPT_NAME, (ev) => {
        announcedPlay = null;
        const { configId } = ev.game;
        const launchRead = readPlaces(configId).then(safeHandler(SCRIPT_NAME, (places) => {
            if (places !== null) highScores.recordBoard(configId, places);
        }));
        // Read at once, before VPX starts and holds the file.
        launched = { configId, launchRead, snapshot: takeSnapshot(configId), nvCopy: copyNv(ev.game), nvChanged: [] };
        watchedLaunch = launched;
    }));

    // The ROM's .nv copied before VPinMAME writes it, under the ROM's name
    // (vpxtool picks the map from it), replacing an earlier launch's copy:
    // { rom, nvPath, copyPath }, or null without vpxtool, ROM or .nv.
    function copyNv(game) {
        if (!game.rom || !vpxtool.hasVpxtool()) return null;
        const folder = nvramFolderOf(host, game);
        const nvPath = folder === null ? null : `${folder}\\${game.rom}.nv`;
        if (nvPath === null || !host.files.fileExists(nvPath)) return null;
        const copyFolder = `${host.getProjectFolder()}\\${PLAY_SCORE_COPY_FOLDER}`;
        const copyPath = `${copyFolder}\\${game.rom}.nv`;
        try {
            host.files.createFolder(copyFolder);
            host.files.copyFile(nvPath, copyPath);
        } catch (error) {
            log(`"${game.configId}": ${nvPath} could not be copied (${messageOf(error)}); no Play Score.`);
            return null;
        }
        return { rom: game.rom, nvPath, copyPath };
    }

    // The last game vpxtool reads in the .nv: readLastGame()'s answer, or
    // undefined when vpxtool gave none (logged).
    function readLastGameIn(configId, path) {
        return new Promise((resolve) => {
            const giveUp = (why) => {
                log(`"${configId}": ${path} not read by vpxtool (${why}); no Play Score.`);
                resolve(undefined);
            };
            vpxtool.submit({
                scriptName: SCRIPT_NAME,
                args: ["nvram", "show", path],
                apply: ({ exitCode, output }) => {
                    if (exitCode !== 0) {
                        giveUp(`exit code ${exitCode}`);
                        return;
                    }
                    try {
                        resolve(readLastGame(output));
                    } catch (error) {
                        giveUp(messageOf(error));
                    }
                },
                fail: giveUp,
            });
        });
    }

    // After the board read settled the Play: its Play Score, when the
    // game changed only the table's own .nv.
    async function settlePlayScore(bracket, play) {
        const copy = bracket.nvCopy;
        if (copy === null || play === null) return;
        const changed = bracket.nvChanged;
        if (changed.length !== 1 || changed[0].toLowerCase() !== copy.rom.toLowerCase()) return;
        const [before, after] = await Promise.all([readLastGameIn(bracket.configId, copy.copyPath), readLastGameIn(bracket.configId, copy.nvPath)]);
        if (before === undefined || after === undefined) return;
        const result = playScoreOf(before, after);
        if (result.none) log(`"${bracket.configId}": no Play Score for ${play.profileName}: ${result.none}.`);
        else highScores.recordPlayScore(bracket.configId, play, result.score);
    }

    profileStore.onPlay(safeHandler(SCRIPT_NAME, (play) => {
        if (launched && play.configId === launched.configId) announcedPlay = play;
    }));

    // The board read after the game, settled against the last known one.
    async function settleAfterGame(bracket, play) {
        await bracket.launchRead;
        await wait(AFTER_READ_DELAY_MS);
        const places = await readPlaces(bracket.configId, { forget: true });
        if (places !== null) {
            settleAndAnnounce(bracket.configId, places, play);
            return;
        }
        try {
            const after = takeSnapshot(bracket.configId, bracket.snapshot);
            const boards = romlessBoards(bracket.configId, bracket.snapshot, after);
            if (boards === null) return;
            if (boards.before !== null) highScores.recordBoardBeforePlay(bracket.configId, boards.before);
            settleAndAnnounce(bracket.configId, boards.after, play);
        } finally {
            // The launch made PinballY forget the board: handed again, the
            // last known one when nothing was read.
            handToPinballY(bracket.configId);
        }
    }

    function settleAndAnnounce(configId, places, play) {
        const best = highScores.settlePlay(configId, places, play);
        if (best) announce(configId, best);
    }

    // Fires after the game, back on the wheel, once the Table ROMs Add-on
    // confirmed the ROM the table ran.
    host.on("postlaunch", safeHandler(SCRIPT_NAME, () => {
        const bracket = launched;
        const play = announcedPlay;
        launched = null;
        announcedPlay = null;
        if (!bracket) return;
        // The board stays held until the Play Score is settled too.
        const release = highScores.holdBoardForPlay(bracket.configId);
        const settlePlayScoreSafely = () => safeHandler(SCRIPT_NAME, settlePlayScore)(bracket, play);
        safeHandler(SCRIPT_NAME, settleAfterGame)(bracket, play)
            .then(settlePlayScoreSafely, settlePlayScoreSafely)
            .then(release, release);
    }));
}
