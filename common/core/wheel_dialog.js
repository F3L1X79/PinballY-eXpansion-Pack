// ============================================================
// Wheel dialog module: Add-ons submit a dialog with a priority; it shows them
// one at a time through the Drawn Menu module, only when the wheel is free,
// highest priority first, so main.js's order never decides. A drawn dialog
// (see docs/adr/0011) draws itself and holds the queue until it closes.
// Listens to "command" and "wheelmode".
// - A dialog not ready yet holds its place and every dialog after it; a stale one is dropped.
// - A screen drawn over the wheel keeps it busy once handed to waitFor().
// - Nothing shows before PinballY lays its window out (common/core/window_layout.js).
// - A message is measured and drawn by drawn_menu_painter.js (computeGeometry, drawTexts).
// ============================================================

import { safeHandler, logHandlerError } from "./safe_handler.js";
import { logError } from "./error_log.js";
import { createPinballYHost } from "./pinbally_host.js";
import { createNativeMenus, getDrawnMenus } from "../drawn_menu/drawn_menu.js";
import { getWindowLayout, ALWAYS_LAID_OUT } from "./window_layout.js";

const SCRIPT_NAME = "WheelDialog";

// Lower is shown first.
// The update messages, the PinballY Version Notice and the Script Reader Prompt
// come before the Startup Screen, so launching a table from it can't skip them
// (docs/adr/0018).
export const DIALOG_PRIORITY = Object.freeze({
    UPDATE_RESULT: 0,
    UPDATE_PROMPT: 1,
    VERSION_NOTICE: 2,
    SCRIPT_READER_PROMPT: 3,
    STARTUP_PROMPT: 4,
    REWARD_PROMPT: 5,
    RATING_PROMPT: 6,
    RESTART_FAILED: 7,
});

// menus: what shows a native-style dialog (common/drawn_menu/drawn_menu.js);
// windowLayout: tells when PinballY's window has its final size.
export function createWheelDialogs(host, menus = createNativeMenus(host), windowLayout = ALWAYS_LAID_OUT) {
    // Waiting dialogs, sorted by priority, then submission order.
    const queue = [];
    // Dialog on screen, with the command of each of its buttons.
    let shown = null;
    // Only one dialog is on screen at a time, so button commands are reused
    // from dialog to dialog; the pool only grows when a dialog needs more
    // buttons than any before it, since command IDs are finite.
    const buttonCommands = [];
    const drawnClosedListeners = [];
    // Drawn over the wheel in its UI mode: no "wheelmode" tells their close.
    const wheelOverlays = [];
    const overlayClosedListeners = [];

    function getButtonCommand(index) {
        while (buttonCommands.length <= index) {
            buttonCommands.push(host.allocateCommand(`wheelDialogButton${buttonCommands.length}`));
        }
        return buttonCommands[index];
    }

    let showScheduled = false;

    const isLive = dialog => !(dialog.isStale && dialog.isStale());

    function showNext() {
        showScheduled = false;
        for (let index = queue.length - 1; index >= 0; index--) if (!isLive(queue[index])) queue.splice(index, 1);
        if (shown || queue.length === 0) return;
        // A dialog opened while a game is exiting would sit under the launch
        // overlay, and one opened over another menu would replace it.
        if (host.getUIMode() !== "wheel") return;
        if (isOverlayOpen()) return;
        // Drawn before PinballY lays its window out, a dialog or a startup
        // screen would show stretched until its next redraw.
        if (!windowLayout.isLaidOut()) {
            windowLayout.whenLaidOut(scheduleShowNext);
            return;
        }
        // Whatever it waits for must not wait for this queue in turn: a
        // drawn dialog queued behind it would hold the toasts it waits on.
        if (queue[0].isReady && !queue[0].isReady()) return;

        const dialog = queue.shift();
        if (dialog.open) {
            openDrawn(dialog);
            return;
        }
        const buttons = dialog.buttons.map((button, index) => ({ ...button, cmd: getButtonCommand(index) }));
        const current = { dialog, buttons };
        shown = current;
        // The button and Exit both close the dialog.
        const onClose = () => {
            if (shown !== current) return;
            shown = null;
            scheduleShowNext();
        };

        menus.show(
            dialog.id,
            [
                { title: dialog.title, cmd: -1 },
                { title: dialog.message, cmd: -1 },
                { cmd: -1 },
                ...buttons.map(({ label, cmd }) => ({ title: label, cmd })),
            ],
            { dialogStyle: true, onClose }
        );
        if (dialog.onShown) dialog.onShown();
    }

    function openDrawn(dialog) {
        const current = { dialog, drawn: true };
        shown = current;
        // Ignores a second call, and a call from a dialog no longer on screen.
        const close = () => {
            if (shown !== current) return;
            shown = null;
            for (const listener of drawnClosedListeners) listener();
            scheduleShowNext();
        };
        try {
            dialog.open(close);
        } catch (error) {
            // A dialog that cannot open must not hold the queue forever.
            logHandlerError(SCRIPT_NAME, error);
            close();
        }
    }

    // Shows the next dialog one tick later, so every dialog submitted in the
    // meantime competes on priority, such as those of all the add-ons' init
    // at startup.
    function scheduleShowNext() {
        if (showScheduled) return;
        showScheduled = true;
        setTimeout(safeHandler(SCRIPT_NAME, showNext), 0);
    }

    // dialog: either a native one { id, title, message, buttons, priority,
    // onShown }, or a drawn one { priority, open(close) }, open drawing it and close
    // to be called once it is gone. Either may add isReady (optional: the
    // queue waits on it while it returns false; wake() once it may be ready)
    // and isStale (optional: dropped unshown when it returns true at its turn).
    function submit(dialog) {
        if (!dialog.open && !dialog.title) {
            logError(SCRIPT_NAME, `ERROR the "${dialog.id}" dialog has no title: dropped.`, host);
            return;
        }
        const insertAt = queue.findIndex(queued => queued.priority > dialog.priority);
        if (insertAt === -1) queue.push(dialog);
        else queue.splice(insertAt, 0, dialog);
        scheduleShowNext();
    }

    // Fires on every command. The menu reports its close after the
    // command, so the queue advances there, not here. Async because an
    // action may animate the wheel, so its rejections are logged too.
    host.on("command", safeHandler(SCRIPT_NAME, async ev => {
        if (!shown || shown.drawn) return;
        const button = shown.buttons.find(item => item.cmd === ev.id);
        if (button && button.action) await button.action();
    }));

    // Fires on every return to the wheel (from a game, a menu or a popup).
    host.on("wheelmode", safeHandler(SCRIPT_NAME, scheduleShowNext));

    // True when no dialog is on screen or waiting, so an add-on drawing over
    // the wheel knows it would not cover one.
    const isIdle = () => !shown && !queue.some(isLive);

    // True while a drawn dialog is on screen or waiting its turn: toasts
    // and Confetti Showers wait for it to close instead of drawing over it,
    // and must not start in the tick before it opens.
    const hasDrawnDialog = () => Boolean(shown && shown.drawn) || queue.some(dialog => dialog.open);

    // listener: runs, guarded, each time a drawn dialog closes.
    function onDrawnDialogClosed(listener) {
        drawnClosedListeners.push(safeHandler(SCRIPT_NAME, listener));
    }

    // True while a screen handed to waitFor() is open.
    const isOverlayOpen = () => wheelOverlays.some(overlay => overlay.isOpen());

    // screen: { isOpen(), onClosed(listener) }; no dialog shows while it is
    // open, and the queue moves on once it closes.
    function waitFor(screen) {
        wheelOverlays.push(screen);
        screen.onClosed(() => {
            scheduleShowNext();
            for (const listener of overlayClosedListeners) listener();
        });
    }

    // listener: runs, guarded, each time a screen handed to waitFor() closes,
    // for what else waits for a free wheel.
    function onOverlayClosed(listener) {
        overlayClosedListeners.push(safeHandler(SCRIPT_NAME, listener));
    }

    // A dialog's own menu is never open while the queue is free to move:
    // it is the one on screen.
    waitFor(menus);

    return { submit, wake: scheduleShowNext, isIdle, hasDrawnDialog, onDrawnDialogClosed, waitFor, isOverlayOpen, onOverlayClosed };
}

let sharedWheelDialogs = null;

// One queue for every add-on, so their dialogs never replace each other.
export function getWheelDialogs() {
    if (!sharedWheelDialogs) sharedWheelDialogs = createWheelDialogs(createPinballYHost(), getDrawnMenus(), getWindowLayout());
    return sharedWheelDialogs;
}
