// ============================================================
// High Scores: toasts the best place a Play won on its table's board (settled by Play
// Settlement, which credits it to the Profile active when the Play started). With vpxtool,
// keeps the Play Score read from the ROM's .nv (copied to play_scores\ at launch), toasting
// a House Record or Personal Best when no place was won; the rules' oddities go to
// play_scores_anomalies.log. Adds "High Score Boards" and "My High Scores" to the main menu.
// - The board around a Play and the ROM-less sources live in Play Settlement.
// - Replaces PinballY's own "High Scores": removes its entry, cancels HighScores.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { logError } from "../common/core/error_log.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getProfileRewards } from "../common/avatar_frames/profile_rewards.js";
import { getHighScoreStore, SCRIPT_NAME } from "../common/high_scores/high_score_store.js";
import { createHighScoreBoard } from "../common/high_scores/high_score_board.js";
import { createMyHighScores } from "../common/high_scores/my_high_scores.js";
import { createPlaySettlement } from "../common/high_scores/play_settlement.js";
import { getAchievementToasts, TOAST_KIND } from "../common/achievements/achievement_toast.js";
import { getMainMenu, MAIN_MENU_POSITION } from "../common/menus/main_menu.js";
import { isSeparator } from "../common/menus/menu_separator.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { getDrawnScreenControls } from "../common/core/drawn_screen_controls.js";
import { getWheelDialogs } from "../common/core/wheel_dialog.js";
import { displayNameOf } from "../common/profiles/profile_name.js";
import lang from "../common/core/i18n.js";
import { getVpxtoolRunner } from "../common/vpxtool/vpxtool_runner.js";
import { getLaunchBracket } from "../common/core/launch_bracket.js";
import { getNvramWatch, nvramFolderOf } from "../common/vpxtool/nvram_watch.js";
import { readNvramAnswer, lastGameOf, playScoreOf } from "../common/high_scores/last_game_reader.js";
import { createPlayScoreAnomalyLog, valueAnomaliesOf, ANOMALY } from "../common/high_scores/play_score_anomaly_log.js";

const BOARD_ENTRY = "highScoreBoard";
// The pack's folder for the .nv copied at launch, one per ROM.
const PLAY_SCORE_COPY_FOLDER = "play_scores";
// Unfinished Plays in a row on a ROM that make an anomaly: the sign of a
// game_over that never turns true.
const UNFINISHED_PLAYS_IN_A_ROW = 3;

export default function init() {
    const host = createPinballYHost();
    const profileStore = getProfileStore();
    const highScores = getHighScoreStore();
    const toasts = getAchievementToasts();
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    // From a launch's start to its end, for its Play Score: { configId,
    // nvCopy, nvChanged (the ROMs whose .nv the game changed, once the
    // NVRAM watch told) }.
    let launched = null;
    // The Play the Profile store announced for the launched table, if any.
    let announcedPlay = null;
    const vpxtool = getVpxtoolRunner();
    const anomalies = createPlayScoreAnomalyLog(host, SCRIPT_NAME);
    // The last launch, kept past its end: the NVRAM watch tells it at that
    // end, before Play Settlement tells this Add-on (it subscribed first).
    let watchedLaunch = null;
    getNvramWatch().watch(SCRIPT_NAME, {
        onGameEnded: ({ configId, changed }) => {
            if (watchedLaunch && watchedLaunch.configId === configId) watchedLaunch.nvChanged = changed;
        },
    });

    const settlement = createPlaySettlement(host, {
        highScores, launchBracket: getLaunchBracket(), scriptName: SCRIPT_NAME, scoreText: lang.profileStats.number,
        onBegan: onLaunchBegan, onEnded: onLaunchEnded,
    });

    const board = createHighScoreBoard(host, {
        highScores, profileRewards: getProfileRewards(), drawingAhead: getDrawingAhead(), drawnScreenControls: getDrawnScreenControls(),
        refresh: configId => settlement.refreshBoard(configId),
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

    const messageOf = error => (error instanceof Error ? error.message : String(error));

    // A High Score Toast: titleOf(table) gives its title; the toast module
    // holds it until the wheel is back and the toasts before it have shown.
    function submitHighScoreToast(configId, { titleOf, score, tileNumber, takenFrom }) {
        const TEXT = lang.highScores;
        const game = host.getGameInfo(configId);
        toasts.submit({
            kind: TOAST_KIND.HIGH_SCORE,
            tileNumber,
            title: titleOf(game ? game.title : configId),
            description: TEXT.toastScore(lang.profileStats.number(score)),
            extraLine: takenFrom ? TEXT.takenFrom(displayNameOf(takenFrom)) : undefined,
            onShown: () => {},
        });
    }

    // One toast per Play, for the best place won.
    function announce(configId, place) {
        const TEXT = lang.highScores;
        submitHighScoreToast(configId, {
            titleOf: table => (place.rank === 1 ? TEXT.tableRecordTitle(table) : TEXT.toastTitle(table, place.rank)),
            score: place.score, tileNumber: place.rank, takenFrom: place.takenFromProfile,
        });
    }

    // At "prelaunch", once Play Settlement read the board.
    function onLaunchBegan({ game }) {
        announcedPlay = null;
        launched = { configId: game.configId, nvCopy: copyNv(game), nvChanged: [] };
        watchedLaunch = launched;
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
            logError(SCRIPT_NAME, `ERROR "${game.configId}": ${nvPath} could not be copied (${messageOf(error)}); no Play Score.`, host, error);
            return { none: null };
        }
        return { rom: game.rom, nvPath, copyPath };
    }

    // Why the .nv files the game changed give no Play Score, or null when
    // the game changed the table's .nv alone.
    function whyChangedNvGiveNone(rom, changed) {
        if (changed.length === 0) return `${rom}.nv did not change during the game`;
        if (changed.length > 1) return `${changed.length} .nv files changed during the game (${changed.join(", ")})`;
        if (changed[0].toLowerCase() !== rom.toLowerCase()) return `${changed[0]}.nv changed during the game, not the table's ${rom}.nv`;
        return null;
    }

    // vpxtool's answer for the .nv (readNvramAnswer()'s), or undefined when
    // it gave none (logged, as an error unless it has no map for the ROM;
    // no map and an unreadable answer go to the anomaly log, with the
    // answer read before, if any).
    function readAnswerIn(configId, rom, path, answerBefore) {
        return new Promise((resolve) => {
            const giveUp = (why) => {
                logError(SCRIPT_NAME, `ERROR "${configId}": ${path} not read by vpxtool (${why}); no Play Score.`, host);
                resolve(undefined);
            };
            const anomaly = check => anomalies.write({ configId, rom, check, before: answerBefore });
            vpxtool.submit({
                scriptName: SCRIPT_NAME,
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

    // A Play that won no place on the table's board: its Play Score's
    // House Record or Personal Best, without a place number.
    function announceRecord(configId, record, score) {
        const TEXT = lang.highScores;
        submitHighScoreToast(configId, {
            titleOf: record.kind === "houseRecord" ? TEXT.houseRecordTitle : TEXT.personalBestTitle,
            score, takenFrom: record.takenFrom,
        });
    }

    // After the board read settled the Play: its Play Score, when the
    // game changed only the table's own .nv; why not logged otherwise,
    // silently for a launch shorter than a Play. placeWon: the High Score
    // Toast stands for the Play, so its Play Score announces nothing.
    // boardAfter: the board places read after the game, or null.
    async function settlePlayScore(bracket, play, placeWon, boardAfter) {
        const copy = bracket.nvCopy;
        if (copy === null || play === null) return;
        const changed = bracket.nvChanged;
        const noPlayScore = why => log(`"${bracket.configId}": no Play Score for ${play.profileName}: ${why}.`);
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
        const before = await readAnswerIn(bracket.configId, copy.rom, copy.copyPath, null);
        if (before === undefined) return;
        const after = await readAnswerIn(bracket.configId, copy.rom, copy.nvPath, before);
        if (after === undefined) return;
        const anomaly = (check, detail) => anomalies.write({ configId: bracket.configId, rom: copy.rom, check, detail, before, after });
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
        const record = highScores.recordPlayScore(bracket.configId, play, result.score);
        if (record !== null && !placeWon) announceRecord(bracket.configId, record, result.score);
    }

    profileStore.onPlay(safeHandler(SCRIPT_NAME, (play) => {
        if (launched && play.configId === launched.configId) announcedPlay = play;
    }));

    // After the game, told by Play Settlement; a launch a later script
    // cancelled ran no game.
    function onLaunchEnded({ cancelled, settleBoard }) {
        const bracket = launched;
        const play = announcedPlay;
        launched = null;
        announcedPlay = null;
        if (!bracket || cancelled) return;
        // The board stays held until the Play Score is settled too.
        const release = highScores.holdBoardForPlay(bracket.configId);
        // At most one toast per Play: a board settle that failed (logged)
        // may have won a place, so the Play Score then announces nothing.
        const settlePlayScoreSafely = (placeWon, places) => safeHandler(SCRIPT_NAME, settlePlayScore)(bracket, play, placeWon, places);
        const settleAndAnnounce = () => settleBoard(play).then(({ best, places }) => {
            if (best) announce(bracket.configId, best);
            return { placeWon: Boolean(best), places };
        });
        safeHandler(SCRIPT_NAME, settleAndAnnounce)()
            .then(({ placeWon, places }) => settlePlayScoreSafely(placeWon, places), () => settlePlayScoreSafely(true, null))
            .then(release, release);
    }
}
