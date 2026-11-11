// ============================================================
// The Rocket Game's score screen: the score just made, then the Rocket Board,
// in a Steamball panel over the game's crash. Prepared through the shared screen opening, closed
// by the first button or after 10 s, then onClose() (once, however it closed).
// - Its buttons and attract mode go through the Drawn Screen controls; attract mode held off.
// - A held flipper's repeat never closes it: the player was steering at the crash.
// ============================================================

import lang from "../core/i18n.js";
import { safeHandler } from "../core/safe_handler.js";
import { prepareDrawnScreen } from "../stats/drawn_screen.js";
import { drawBackdrop, oneLine } from "../drawing/steamball_drawing.js";
import { STEAMBALL_COLORS as COLORS, STEAMBALL_FONTS as FONTS } from "../drawing/steamball_palette.js";

const SCRIPT_NAME = "RocketGame";
const REFERENCE_HEIGHT = 1920;
// Over the game's layers (7500 to 7591).
const ROCKET_SCORE_Z_INDEX = Object.freeze({ backdrop: 7700, score: 7710, board: 7720 });
const PANEL = { w: 900, h: 1120, y: 400 };
const CLOSE_AFTER_MS = 10000;

// The score's part at the top of the panel, the board's under it.
const SCORE_PART_H = 460;
const BOARD_LINE_H = 120;
const BOARD_MARGIN = 60;
// A board line's columns: the place, the name in what is left, the score.
const BOARD_COLUMNS = Object.freeze({ place: 90, score: 270, gap: 20 });

const panelOf = referenceWidth => ({ x: (referenceWidth - PANEL.w) / 2, y: PANEL.y, w: PANEL.w, h: PANEL.h });
const scorePartOf = panel => ({ x: panel.x, y: panel.y, w: panel.w, h: SCORE_PART_H });
const boardPartOf = panel => ({ x: panel.x + BOARD_MARGIN, y: panel.y + SCORE_PART_H, w: panel.w - 2 * BOARD_MARGIN, h: panel.h - SCORE_PART_H - BOARD_MARGIN });

// drawingAhead and drawnScreenControls: the pack's shared ones.
export function createRocketScoreScreen(host, { drawingAhead, drawnScreenControls }) {
    const controls = drawnScreenControls.register(SCRIPT_NAME);

    function paintScore(dc, score, { w, h }) {
        oneLine(host, dc, lang.rocketGame.yourScore, { x: 0, y: h * 0.14, width: w, height: h * 0.2, size: 64, weight: 600, color: COLORS.description, font: FONTS.display, align: "center" });
        oneLine(host, dc, String(score), { x: 0, y: h * 0.38, width: w, height: h * 0.45, size: 200, minSize: 80, weight: 700, color: COLORS.gold, font: FONTS.display, align: "center", cut: false });
    }

    // Each line: its place, the Profile's name and the score; the highlighted one in gold.
    function paintBoard(dc, board, highlighted, { w }) {
        board.forEach((line, index) => {
            const y = index * BOARD_LINE_H;
            const color = index === highlighted ? COLORS.gold : COLORS.title;
            const text = { y, height: BOARD_LINE_H, size: 64, minSize: 40, color, font: FONTS.display };
            oneLine(host, dc, String(index + 1), { ...text, x: 0, width: BOARD_COLUMNS.place });
            oneLine(host, dc, line.profileName, { ...text, x: BOARD_COLUMNS.place + BOARD_COLUMNS.gap, width: w - BOARD_COLUMNS.place - BOARD_COLUMNS.score - 2 * BOARD_COLUMNS.gap });
            oneLine(host, dc, String(line.score), { ...text, x: w - BOARD_COLUMNS.score, width: BOARD_COLUMNS.score, align: "right", cut: false });
        });
    }

    function setOpacity(screen, opacity) {
        for (const layer of screen.drawn.layers) layer.alpha = opacity;
    }

    // The controls' close, whatever closed it: a button, the time, attract
    // mode never (held off), a failing step, Exit while getting ready.
    function remove(screen) {
        host.clearTimeout(screen.timer);
        screen.drawn.close();
        screen.onClose();
    }

    // board: the Rocket Board's lines, { profileName, score, date }, best first;
    // highlighted: the index of the game just played, -1 when off the board.
    // onClose(): once the screen has gone, or its opening was given up.
    function open({ score, board, highlighted, onClose }) {
        const drawn = prepareDrawnScreen(host, SCRIPT_NAME, { referenceHeight: REFERENCE_HEIGHT, backdropZIndex: ROCKET_SCORE_Z_INDEX.backdrop, drawingAhead });
        const screen = { drawn, onClose, timer: null };
        const close = () => screen.controlled.close();
        screen.controlled = controls.open({
            onMove: (direction, isRepeat) => { if (!isRepeat) close(); },
            onChoose: close,
            onExit: close,
            close: () => remove(screen),
        }, { holdsAttractMode: true });
        let panel = null;
        drawn.draw(() => drawn.drawBackdrop((dc, size, referenceWidth) => {
            panel = panelOf(referenceWidth);
            drawBackdrop(dc, size, REFERENCE_HEIGHT, panel);
        }));
        drawn.draw(() => {
            const part = scorePartOf(panel);
            drawn.drawPiece(ROCKET_SCORE_Z_INDEX.score, part, dc => paintScore(dc, score, part));
        });
        drawn.draw(() => {
            const part = boardPartOf(panel);
            drawn.drawPiece(ROCKET_SCORE_Z_INDEX.board, part, dc => paintBoard(dc, board, highlighted, part));
        });
        drawn.start({
            onReady: () => {
                screen.controlled.ready();
                screen.timer = host.setTimeout(safeHandler(SCRIPT_NAME, close), CLOSE_AFTER_MS);
            },
            setOpacity: opacity => setOpacity(screen, opacity),
            onFailed: () => screen.controlled.fail(),
        });
    }

    return { open, isOpen: controls.isOpen, onClosed: controls.onClosed };
}
