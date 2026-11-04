// ============================================================
// Backglass Clock: the time in a small borderless window in front of VPX's
// backglass while a table runs, the Steamball panel's blue gradient in a thin gold frame, the time drawn
// like the wheel Clock's (drop shadow, gold underline), redrawn when the minute changes.
// Shown on "prelaunch", gone on "gameover" or a failed launch's "postlaunch";
// never during a media capture or on a single screen. Off by default.
// - Never shown while a game runs: that activates PinballY, which opens the pause menu (#386).
// - Every raise keeps the window's place and never takes VPX's focus.
// - clientRect isn't in the visible window's units: only its ratio is read.
// - Moved onto the backglass screen only from outside it: the owner's place sticks.
// ============================================================

import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { UNBOUNDED, fillGradient } from "../common/drawing/steamball_drawing.js";
import { STEAMBALL_COLORS } from "../common/drawing/steamball_palette.js";
import { drawShadowedText, measureShadowedText } from "../common/drawing/shadowed_text.js";
import { CLOCK_COLORS, clockTextOf, createMinuteTick } from "../common/clock/minute_tick.js";
import { TIME_TEXT, WHEEL_CLOCK } from "../common/clock/wheel_clock_layout.js";

const SCRIPT_NAME = "BackglassClock";

// PinballY saves and restores the window's place and size under it.
const CONFIG_VAR_PREFIX = "BackglassClock";
// VPX's B2S loads after "gamestarted" and may come in front: raised again
// on this schedule, then at each minute (as held on the cabinet, spec #369).
const RAISE_DELAYS_MS = [2000, 5000, 10000, 20000, 40000];
// Its size at the backglass screen's top right, until the owner places it.
const DEFAULT_SIZE = Object.freeze({ width: 320, height: 110 });
const LAYER_Z_INDEX = 100;
// PinballY stretches this canvas over the whole window; its width follows
// the window's aspect ratio, so the text keeps its proportions.
const CANVAS_HEIGHT = 200;
const FRAME_THICKNESS = 1;
// Between the frame and the time's ends.
const TEXT_MARGIN = 16;
// Segoe UI's empty space above the digits, as a share of its line height
// (ascent 2210, cap height 1434, descent 514, in font units).
const CAP_TOP = (2210 - 1434) / (2210 + 514);
// The wheel Clock's underline, at the same scale to the text.
const TIME_SIZE = Object.freeze({ start: 52, min: 8 });
const UNDERLINE = Object.freeze({ thickness: 4, gap: 7 });

const isInside = (inner, outer) => inner.left >= outer.left && inner.top >= outer.top
    && inner.right <= outer.right && inner.bottom <= outer.bottom;

// The top right corner, with the wheel Clock's corner margin scaled to the screen's height.
function defaultPlaceOn(screenRect) {
    const margin = Math.round(WHEEL_CLOCK.left * (screenRect.bottom - screenRect.top) / WHEEL_CLOCK.referenceHeight);
    return { left: screenRect.right - DEFAULT_SIZE.width - margin, top: screenRect.top + margin, ...DEFAULT_SIZE };
}

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
    let launchGoingAhead = false;

    const timeStyle = size => ({ size, weight: TIME_TEXT.weight });
    const measureTime = (text, size) => measureShadowedText(host, timeStyle(size), text, UNBOUNDED);

    function draw() {
        const { width, height } = clockWindow.getClientSize();
        const ratio = width > 0 && height > 0 ? width / height : 1;
        const canvasWidth = Math.max(Math.round(CANVAS_HEIGHT * ratio), 1);
        layer.draw(dc => {
            // Two fills rather than frameRect, which centres its line on the
            // canvas edge: GDI+ then keeps more of the left and top sides.
            dc.fillRect(0, 0, canvasWidth, CANVAS_HEIGHT, CLOCK_COLORS.gold);
            fillGradient(dc, FRAME_THICKNESS, FRAME_THICKNESS, canvasWidth - 2 * FRAME_THICKNESS,
                CANVAS_HEIGHT - 2 * FRAME_THICKNESS, STEAMBALL_COLORS.panelTop, STEAMBALL_COLORS.panel);
            const text = clockTextOf(host.now());
            const width = canvasWidth - 2 * TEXT_MARGIN;
            // The size goes down until the time fits inside the frame, never cut.
            let size = TIME_SIZE.start;
            while (size > TIME_SIZE.min && measureTime(text, size).width > width) size--;
            const measured = measureTime(text, size);
            // The digits and the underline, centred together in the box.
            const capTop = CAP_TOP * measured.height;
            const visibleHeight = measured.height - capTop + UNDERLINE.gap + UNDERLINE.thickness;
            const top = (CANVAS_HEIGHT - visibleHeight) / 2 - capTop;
            // Centred across the whole canvas: the margins keep a time that
            // only just fits from wrapping on rounding.
            drawShadowedText(host, dc, timeStyle(size), CLOCK_COLORS.text, text, top, { width: canvasWidth });
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
    // PinballY opens a new one on the playfield screen. Read before the game:
    // Force Backglass hides the backglass on "gamestarted".
    function placeOnBackglassScreen() {
        let backglassRect = null;
        let problem = "the backglass window has no frame";
        try {
            backglassRect = host.getBackglassWindowRect();
        } catch (error) {
            problem = `unreadable: ${error.message}`;
        }
        if (!backglassRect) {
            host.log(`[${SCRIPT_NAME}] Backglass screen unknown (${problem}): the clock stays where it is.`);
            return;
        }
        if (!isInside(clockWindow.getWindowRect(), backglassRect)) clockWindow.moveTo(defaultPlaceOn(backglassRect));
    }

    function hide() {
        clearTimers();
        if (!shown) return;
        shown = false;
        clockWindow.showWindow(false);
        clockWindow.setTopmost(false);
    }

    // "launchoverlayshow" fires in the same playGame() call as "prelaunch",
    // unless a later listener cancelled the launch or its thread never started.
    host.on("launchoverlayshow", safeHandler(SCRIPT_NAME, () => { launchGoingAhead = true; }));

    // Shown here, while no game runs yet (see the header). Monitors are
    // counted at each launch, since a screen can be plugged in or out.
    host.on("prelaunch", safeHandler(SCRIPT_NAME, (ev) => {
        hide();
        launchGoingAhead = false;
        if (host.countMonitors() <= 1 || ev.command === host.getBuiltInCommand("CaptureGo")) return;
        // Placed before it shows, so it never flashes on the playfield first.
        placeOnBackglassScreen();
        // Again at each game: its title bar was seen back on the cabinet.
        clockWindow.setBorderless(true);
        minuteTick.start();
        clockWindow.showWindow(true);
        shown = true;
        host.setTimeout(safeHandler(SCRIPT_NAME, () => { if (!launchGoingAhead) hide(); }), 0);
    }));

    // Only raised from here on, which never activates PinballY.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        if (!shown) return;
        // A capture whose launch command didn't say so: hidden before it records.
        if (host.getFullUIMode().capture) {
            hide();
            return;
        }
        clockWindow.setTopmost(true);
        raiseTimers = RAISE_DELAYS_MS.map(delay =>
            host.setTimeout(safeHandler(SCRIPT_NAME, () => clockWindow.setTopmost(true)), delay));
    }));
    // "gameover" also fires after Exit Game; "postlaunch" ends a launch that
    // failed or was cancelled before "gamestarted".
    host.on("gameover", safeHandler(SCRIPT_NAME, hide));
    host.on("postlaunch", safeHandler(SCRIPT_NAME, hide));

    // Deferred until main.js has finished, like Force Backglass, so the hide
    // wins over PinballY's saved Visible setting for the window.
    host.setTimeout(safeHandler(SCRIPT_NAME, () => clockWindow.showWindow(false)), 0);
}
