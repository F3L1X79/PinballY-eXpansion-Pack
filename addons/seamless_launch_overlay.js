// ============================================================
// Hides the wheel while a table launches and closes, showing the Loader and
// the current step beneath it instead of PinballY's launch message, to avoid
// a black flash before the table's own loading screen; the comet alone also
// turns in the middle of the backglass. Listens to "launchoverlayshow",
// "launchoverlaymessage" and "launchoverlayhide".
// - A launch screen another script cancelled first is reported to the Conflict Notice, and drawn all the same.
// - Never looks at Force Backglass: the backglass comet is seen whenever its window shows.
// - The backglass comet stays off during a capture, never to land in the captured media.
// ============================================================

import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { createLoader, LOADER_SCREEN } from "../common/drawing/loader.js";
import lang from "../common/core/i18n.js";
import { CONFLICT, getConflictNotice } from "../common/conflicts/conflict_notice.js";

const SCRIPT_NAME = "SeamlessLaunchOverlay";

// PinballY draws the launch overlay above every layer and its own layers
// cannot be resized, so the Loader is a layer just under it, seen through
// its nearly clear background; below the menus (6000 and up), such as a
// game's pause menu.
const LOADER_Z_INDEX = 5999;

const STEP_TEXT = lang.launchSteps;

export default function init() {
    const host = createPinballYHost();
    const loader = createLoader(host, { zIndex: LOADER_Z_INDEX, caption: STEP_TEXT.loading });
    const backglassLoader = createLoader(host, { zIndex: LOADER_Z_INDEX, screen: LOADER_SCREEN.BACKGLASS });

    // Fires when the launch overlay appears: hides the wheel and replaces the
    // default overlay background (preventDefault suppresses PinballY's own).
    host.on("launchoverlayshow", safeHandler(SCRIPT_NAME, ev => {
        // Only an External Add-on cancels it before this listener: no other one of the pack does.
        const takenBefore = ev.defaultPrevented;
        host.showWheel(false);
        host.setUnderlay("");
        host.getLaunchOverlayBackground().clear(0x20FF00FF);
        ev.preventDefault();
        loader.show();
        backglassLoader.show();
        // Last: a report that fails leaves the launch screen drawn.
        if (takenBefore) getConflictNotice().report(CONFLICT.LAUNCH_SCREEN);
    }));

    // Fires at each step of a launch; preventDefault suppresses PinballY's
    // text and the table's wheel icon. The overlay stays up while the game
    // runs, so the comet and its words stop once the game plays and come
    // back while it closes, unchanged until the overlay goes; a launch that
    // never plays keeps them until then. A capture is named only while the
    // comet shows, never over a game being played. Exit Game sends
    // "terminating" and skips "gameover"; a table that closes on its own, or
    // after a capture, sends only "gameover".
    host.on("launchoverlaymessage", safeHandler(SCRIPT_NAME, ev => {
        ev.preventDefault();
        if (ev.id === "running") {
            loader.hide();
            backglassLoader.hide();
        }
        if (ev.id === "terminating" || ev.id === "gameover") {
            loader.show(STEP_TEXT.closing);
            backglassLoader.show();
        }
        if (ev.id === "capturing") {
            if (loader.isShown()) loader.show(STEP_TEXT.capturing);
            backglassLoader.hide();
        }
    }));

    host.on("launchoverlayhide", safeHandler(SCRIPT_NAME, () => {
        host.showWheel(true);
        loader.hide();
        backglassLoader.hide();
    }));
}
