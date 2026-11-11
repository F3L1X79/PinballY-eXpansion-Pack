// ============================================================
// Rocket Game: the Rocket Easter Egg's game, chosen from the main menu by a
// Profile that has had that Easter Egg (a Profile Reset hides it again). An
// intro naming the buttons, the game, then the score screen and the Rocket Board;
// the main menu comes back on the entry, whether the game crashed, was given up or could not start.
// - Only a crash saves a score: never a game given up with Exit, never the Easter Egg's.
// - Shares the Easter Egg's engine (common/rocket/rocket_engine.js): one game at a time.
// - Never named in the settings: "Hidden Games", so as not to spoil the Easter Egg.
// ============================================================

import { getMainMenu, MAIN_MENU_POSITION } from "../common/menus/main_menu.js";
import { getRocketEngine } from "../common/rocket/rocket_engine.js";
import { createRocketScoreScreen } from "../common/rocket/rocket_score_screen.js";
import { getEasterEggRules, EASTER_EGG } from "../common/easter_eggs/easter_egg_rules.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { getDrawnScreenControls } from "../common/core/drawn_screen_controls.js";
import { getWheelDialogs } from "../common/core/wheel_dialog.js";
import { logHandlerError } from "../common/core/safe_handler.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { createRocketBoard } from "../common/rocket/rocket_board.js";
import lang from "../common/core/i18n.js";

const SCRIPT_NAME = "RocketGame";
const ENTRY = "rocketGame";
// Against the Easter Egg's 1.9 s: long enough to read the commands.
const INTRO_MS = 3500;
const NO_BOARD = Object.freeze({ lines: [], highlighted: -1 });

export default function init() {
    const host = createPinballYHost();
    const engine = getRocketEngine();
    const rules = getEasterEggRules();
    const mainMenu = getMainMenu();
    const scoreScreen = createRocketScoreScreen(host, { drawingAhead: getDrawingAhead(), drawnScreenControls: getDrawnScreenControls() });
    // Drawn over the wheel without leaving its UI mode: nothing shows over it.
    getWheelDialogs().waitFor(scoreScreen);
    const backToMainMenu = () => mainMenu.reopenOn(ENTRY);
    const rocketBoard = createRocketBoard(host, { profileStore: getProfileStore() });

    // A score that cannot be saved, or a board that cannot be read, is logged
    // and the score screen still shows: the engine waits for its close to end the game.
    function orLogged(run, fallback) {
        try {
            return run();
        } catch (error) {
            logHandlerError(SCRIPT_NAME, error);
            return fallback;
        }
    }

    // Images missing (logged by canPlay()) or a game already under way: the main menu comes straight back.
    function play() {
        if (engine.isRunning() || !engine.canPlay()) {
            backToMainMenu();
            return;
        }
        engine.start({
            texts: lang.rocket,
            intro: { commands: [lang.rocketGame.changeLane], ms: INTRO_MS },
            exitGivesUp: true,
            onCrashed: (score, end) => {
                const recorded = orLogged(() => rocketBoard.record(score), null);
                const { lines, highlighted } = orLogged(() => rocketBoard.board(recorded), NO_BOARD);
                scoreScreen.open({ score, board: lines, highlighted, onClose: end });
            },
            onEnd: backToMainMenu,
        });
    }

    mainMenu.add({
        name: ENTRY,
        label: lang.rocketGame.menuEntry,
        position: MAIN_MENU_POSITION.ROCKET_GAME,
        action: play,
        shownWhen: () => rules.hasPlayed(EASTER_EGG.ROCKET),
    });
}
