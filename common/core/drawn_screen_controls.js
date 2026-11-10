// ============================================================
// Drawn Screen controls: the player's buttons once a Drawn Screen is open,
// attract mode, and the screens set aside under one another, for the whole
// pack. A stack of openings (one screen can be on it twice); a press acts on
// the top one only, once. Listens to "commandbuttondown" and
// "attractmodestart", from the first screen registered on; an opening may hold attract mode off.
// - Swallows every press while a ready or getting-ready opening is on top.
// - An opening set aside under a child outside the module neither acts nor swallows.
// - Left to screens: opening, fade, Selection Marker, sounds, scrolling, waitFor().
// ============================================================

import { createPinballYHost } from "./pinbally_host.js";
import { safeHandler } from "./safe_handler.js";
import { createClosedListeners } from "./closed_listeners.js";

const SCRIPT_NAME = "DrawnScreenControls";
const HELD_ONCE_COMMANDS = ["Select", "Launch", "Exit"];

// PinballY fires "commandbuttondown" again on each auto-repeat of a held
// button: a held Select, Launch or Exit must count once.
export function isHeldSelectLaunchOrExit(ev) {
    return ev.repeat === true && HELD_ONCE_COMMANDS.includes(ev.command);
}

export function createDrawnScreenControls(host) {
    // Bottom first; each { screen, handlers, onFailed, isReady, isSetAside }.
    const stack = [];
    let isListening = false;

    const top = () => stack[stack.length - 1] || null;
    const isOnStack = entry => stack.includes(entry);

    // Fires on every mapped button press, routed to the top opening only.
    function onPress(ev) {
        const entry = top();
        // Already handled: a Drawn Menu's or a child's press that opened or
        // showed this screen, which must not act on it again.
        if (!entry || ev.defaultPrevented || entry.isSetAside) return;
        // Swallowed first, so a failing choice still never reaches the wheel.
        ev.preventDefault();
        if (isHeldSelectLaunchOrExit(ev)) return;
        // Logged under the screen's own name, a rejected choice included; its
        // promise not returned, or the module's own guard would log it again.
        safeHandler(entry.screen.scriptName, route)(entry, ev);
    }

    function route({ handlers, isReady }, ev) {
        // Getting ready: Exit gives up, as it would leave the ready screen.
        if (!isReady) {
            if (ev.command === "Exit") return handlers.onExit();
            return undefined;
        }
        // isRepeat: an auto-repeat of a held flipper, which most screens follow.
        if (ev.command === "Next" || ev.command === "Prev") return handlers.onMove(ev.command === "Next" ? 1 : -1, ev.repeat === true);
        // Launch is the plunger, which selects in PinballY's own menus too.
        if (ev.command === "Select" || ev.command === "Launch") return handlers.onChoose();
        if (ev.command === "Exit") return handlers.onExit();
        return undefined;
    }

    // Fires when the cabinet sits idle: no screen stays over attract mode
    // nor keeps the buttons, and nothing is brought back; unless the opening
    // on top holds it off, and then no later listener hears a start that never happens.
    function onAttractModeStart(ev) {
        const entry = top();
        if (entry && entry.holdsAttractMode) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            return;
        }
        for (const opening of [...stack].reverse()) close(opening);
    }

    function listen() {
        if (isListening) return;
        isListening = true;
        host.on("commandbuttondown", safeHandler(SCRIPT_NAME, onPress));
        host.on("attractmodestart", safeHandler(SCRIPT_NAME, onAttractModeStart));
    }

    function close(entry) {
        if (!isOnStack(entry)) return;
        stack.splice(stack.indexOf(entry), 1);
        entry.handlers.close();
        entry.screen.closedListeners.tell();
    }

    // The opening goes, then the failure carries on to what it was opened over.
    function fail(entry) {
        if (!isOnStack(entry)) return;
        close(entry);
        entry.onFailed();
    }

    // run(showAgain, giveUp) opens the child over the opening, set aside.
    function openChild(entry, run) {
        entry.handlers.setAside();
        entry.isSetAside = true;
        const showAgain = () => {
            if (!isOnStack(entry) || !entry.isSetAside) return;
            entry.isSetAside = false;
            entry.handlers.showAgain();
        };
        const depth = stack.length;
        try {
            run(showAgain, () => fail(entry));
        } catch (error) {
            // The child's own opening too, if it was on the stack before throwing.
            for (const above of stack.slice(depth).reverse()) close(above);
            fail(entry);
            throw error;
        }
    }

    // scriptName: the screen's, which its handlers' and closed listeners' errors are logged under.
    function register(scriptName) {
        listen();
        const screen = { scriptName, closedListeners: createClosedListeners(scriptName) };
        const openingsOf = () => stack.filter(entry => entry.screen === screen);
        return {
            // handlers: onMove(direction, isRepeat), onChoose(), onExit(), close(), and
            // setAside() and showAgain() for a screen that opens children.
            // onFailed: what fail() carries the failure on to; holdsAttractMode:
            // attract mode cannot start while it is on top. Getting ready until ready().
            open(handlers, { onFailed = () => {}, holdsAttractMode = false } = {}) {
                const entry = { screen, handlers, onFailed, holdsAttractMode, isReady: false, isSetAside: false };
                stack.push(entry);
                return {
                    ready() { entry.isReady = true; },
                    // Wherever it is on the stack; through handlers.close(). Safe to call again.
                    close: () => close(entry),
                    fail: () => fail(entry),
                    openChild: run => openChild(entry, run),
                };
            },
            // While one of its openings is on the stack, set aside included.
            isOpen: () => openingsOf().length > 0,
            // While one of its openings is on the stack and not set aside.
            isShown: () => openingsOf().some(entry => !entry.isSetAside),
            onClosed: screen.closedListeners.onClosed,
        };
    }

    return { register };
}

let sharedControls = null;

// The pack's one Drawn Screen controls.
export function getDrawnScreenControls() {
    if (!sharedControls) sharedControls = createDrawnScreenControls(createPinballYHost());
    return sharedControls;
}
