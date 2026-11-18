// ============================================================
// High Scores: toasts what Play Settlement announces of a Play (the best place it won
// on its table's board, else its Play Score's House Record or Personal Best). Adds
// "High Score Boards" and "My High Scores" to the main menu.
// - The board, the Play Score and their anomalies live in Play Settlement; no launch state here.
// - Replaces PinballY's own "High Scores": removes its entry, cancels HighScores.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { safeHandler } from "../common/core/safe_handler.js";
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
import { getNvramWatch } from "../common/vpxtool/nvram_watch.js";

const BOARD_ENTRY = "highScoreBoard";

export default function init() {
    const host = createPinballYHost();
    const profileStore = getProfileStore();
    const highScores = getHighScoreStore();
    const toasts = getAchievementToasts();
    const settlement = createPlaySettlement(host, {
        highScores, launchBracket: getLaunchBracket(), profileStore, nvramWatch: getNvramWatch(), vpxtool: getVpxtoolRunner(),
        scriptName: SCRIPT_NAME, scoreText: lang.profileStats.number, announce: onAnnounce,
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

    // The best place a Play won.
    function announcePlace(configId, place) {
        const TEXT = lang.highScores;
        submitHighScoreToast(configId, {
            titleOf: table => (place.rank === 1 ? TEXT.tableRecordTitle(table) : TEXT.toastTitle(table, place.rank)),
            score: place.score, tileNumber: place.rank, takenFrom: place.takenFromProfile,
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

    // Told by Play Settlement, at most once per Play.
    function onAnnounce({ configId, place, record, score }) {
        if (place) announcePlace(configId, place);
        else announceRecord(configId, record, score);
    }
}
