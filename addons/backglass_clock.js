// ============================================================
// Backglass Clock: the time in a small borderless window in front of VPX's
// backglass while a table runs, black with a thin gold frame, the time
// underlined in gold like the wheel Clock, redrawn when the minute changes. Shown on "gamestarted", gone on "gameover"; never
// during a media capture or on a single screen. Off by default.
// - Every raise keeps the window's place and never takes VPX's focus.
// - clientRect isn't in the visible window's units: only its ratio is read.
// - Moved onto the backglass screen only from outside it: the owner's place sticks.
// ============================================================

import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { UNBOUNDED, oneLine } from "../common/drawing/steamball_drawing.js";
import { CLOCK_COLORS, clockTextOf, createMinuteTick } from "../common/clock/minute_tick.js";

const SCRIPT_NAME = "BackglassClock";

// PinballY saves and restores the window's place and size under it.
const CONFIG_VAR_PREFIX = "BackglassClock";
// VPX's B2S loads after "gamestarted" and may come in front: raised again
// on this schedule, then at each minute (as held on the cabinet, spec #369).
const RAISE_DELAYS_MS = [2000, 5000, 10000, 20000, 40000];
// Its size at the backglass screen's top left, until the owner places it.
const DEFAULT_SIZE = Object.freeze({ width: 320, height: 110 });
const LAYER_Z_INDEX = 100;
// PinballY stretches this canvas over the whole window; its width follows
// the window's aspect ratio, so the text keeps its proportions.
const CANVAS_HEIGHT = 200;
const FRAME_THICKNESS = 2;
// Between the frame and the time's ends.
const TEXT_MARGIN = 8 * FRAME_THICKNESS;
// The wheel Clock's font, and its underline at the same scale to the text.
const TIME_TEXT = Object.freeze({ size: 52, minSize: 8, weight: 600, font: "Segoe UI" });
const UNDERLINE = Object.freeze({ thickness: 4, gap: 7 });
const BLACK = 0xFF000000;

const isInside = (inner, outer) => inner.left >= outer.left && inner.top >= outer.top
    && inner.right <= outer.right && inner.bottom <= outer.bottom;

export default function init() {
    const host = createPinballYHost();
    const clockWindow = host.createMediaWindow({
        title: lang.expansionPackSettings.addOns.backglassClock.name,
        configVarPrefix: CONFIG_VAR_PREFIX,
        isMediaCapturable: false,
    });
    clockWindow.setShowMediaWhenRunning(true);
    // Without it, the window opens with a Windows title bar.
    clockWindow.setBorderless(true);
    const layer = clockWindow.createDrawingLayer(LAYER_Z_INDEX);
    let raiseTimers = [];
    let shown = false;
    // The backglass screen read at the last "prelaunch", or why it couldn't be.
    let backglassRect = null;
    let backglassRectProblem = "not read before the game";

    function measureTime(text, size) {
        const styled = host.createStyledText({ textAlign: "left", textStyle: { font: TIME_TEXT.font, size, weight: TIME_TEXT.weight } });
        styled.add(text);
        return styled.measure(UNBOUNDED);
    }

    function draw() {
        const { width, height } = clockWindow.getClientSize();
        const ratio = width > 0 && height > 0 ? width / height : 1;
        const canvasWidth = Math.max(Math.round(CANVAS_HEIGHT * ratio), 1);
        layer.draw(dc => {
            // Two fills rather than frameRect, which centres its line on the
            // canvas edge: GDI+ then keeps more of the left and top sides.
            dc.fillRect(0, 0, canvasWidth, CANVAS_HEIGHT, CLOCK_COLORS.gold);
            dc.fillRect(FRAME_THICKNESS, FRAME_THICKNESS, canvasWidth - 2 * FRAME_THICKNESS,
                CANVAS_HEIGHT - 2 * FRAME_THICKNESS, BLACK);
            const text = clockTextOf(host.now());
            const width = canvasWidth - 2 * TEXT_MARGIN;
            // The size goes down until the time fits inside the frame, never cut.
            let size = TIME_TEXT.size;
            while (size > TIME_TEXT.minSize && measureTime(text, size).width > width) size--;
            const measured = measureTime(text, size);
            // The time and its underline, centred together in the box.
            const top = (CANVAS_HEIGHT - measured.height - UNDERLINE.gap - UNDERLINE.thickness) / 2;
            oneLine(host, dc, text, {
                ...TIME_TEXT, size, minSize: size, x: TEXT_MARGIN, y: top, width,
                color: CLOCK_COLORS.text, align: "center", cut: false,
            });
            dc.fillRect(Math.round((canvasWidth - measured.width) / 2), Math.round(top + measured.height + UNDERLINE.gap),
                Math.round(measured.width), UNDERLINE.thickness, CLOCK_COLORS.gold);
        }, canvasWidth, CANVAS_HEIGHT);
    }

    const minuteTick = createMinuteTick(host, SCRIPT_NAME, () => {
        draw();
        clockWindow.setTopmost(true);
    });

    function clearTimers() {
        minuteTick.stop();
        for (const timer of raiseTimers) host.clearTimeout(timer);
        raiseTimers = [];
    }

    // A window outside the backglass screen was never placed by the owner:
    // PinballY opens a new one on the playfield screen.
    function placeOnBackglassScreen() {
        if (!backglassRect) {
            host.log(`[${SCRIPT_NAME}] Backglass screen unknown (${backglassRectProblem}): the clock stays where it is.`);
            return;
        }
        if (!isInside(clockWindow.getWindowRect(), backglassRect)) clockWindow.moveTo({ left: backglassRect.left, top: backglassRect.top, ...DEFAULT_SIZE });
    }

    // Read before the game: Force Backglass hides the backglass on "gamestarted".
    host.on("prelaunch", safeHandler(SCRIPT_NAME, () => {
        backglassRect = null;
        try {
            backglassRect = host.getBackglassWindowRect();
            if (!backglassRect) backglassRectProblem = "the backglass window has no frame";
        } catch (error) {
            backglassRectProblem = `unreadable: ${error.message}`;
        }
    }));

    // Monitors are counted at each game, since a screen can be plugged in or out.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        clearTimers();
        if (host.countMonitors() <= 1 || host.getFullUIMode().capture) return;
        // Placed before it shows, so it never flashes on the playfield first.
        placeOnBackglassScreen();
        // TEMP #372: does showing the clock activate PinballY, opening the
        // pause menu? Each line timed against the Drawn Menus' TEMP lines.
        const tempLog = text => host.log(`[TEMP #372 ${SCRIPT_NAME}] ${host.now().toTimeString().slice(0, 8)}.${String(host.now().getMilliseconds()).padStart(3, "0")} ${text} (mode ${host.getFullUIMode().mode}, menuID ${host.getFullUIMode().menuID})`);
        tempLog("before showWindow(true)");
        clockWindow.showWindow(true);
        tempLog("after showWindow(true)");
        shown = true;
        minuteTick.start();
        raiseTimers = RAISE_DELAYS_MS.map(delay =>
            host.setTimeout(safeHandler(SCRIPT_NAME, () => {
                clockWindow.setTopmost(true);
                tempLog(`raised after ${delay} ms`);
            }), delay));
    }));
    // Also fires after Exit Game.
    host.on("gameover", safeHandler(SCRIPT_NAME, () => {
        clearTimers();
        if (!shown) return;
        shown = false;
        clockWindow.showWindow(false);
        clockWindow.setTopmost(false);
    }));

    // Deferred until main.js has finished, like Force Backglass, so the hide
    // wins over PinballY's saved Visible setting for the window.
    host.setTimeout(safeHandler(SCRIPT_NAME, () => clockWindow.showWindow(false)), 0);
}
