// ============================================================
// Launch Bracket: the pack's one owner of a launch's start and end. Listens
// once to "prelaunch", "launchoverlayshow", "launcherror" and "postlaunch",
// and tells each subscriber "a launch began" and "that launch ended", always
// as a pair, in the order they subscribed. A taker (the Rocket) may take a
// launch over: then no one hears of it.
// - Created by main.js before anything listens: a launch taken over is cancelled with stopImmediatePropagation.
// - A launch an External Add-on cancelled before the pack's listeners is no launch: no taker nor subscriber hears of it.
// - Without "launchoverlayshow" in the same playGame() call, the launch never goes ahead: it ends a tick later.
// - So "gamestarted" decides nothing: a launch that goes ahead is known before it.
// - A failed launch ends at "launcherror", before its "postlaunch".
// ============================================================

import { safeHandler } from "./safe_handler.js";
import { createPinballYHost } from "./pinbally_host.js";

const SCRIPT_NAME = "LaunchBracket";

export function createLaunchBracket(host) {
    // Each: { onBegan(launch), onEnded(launch) }, guarded under its script's name.
    const subscribers = [];
    // Each: take(ev), returning the function that starts what replaces the launch, or null.
    const takers = [];
    // The launch under way: { game, command, goingAhead }; told to subscribers
    // as { game, command } at its start, plus cancelled at its end.
    let current = null;

    function end({ cancelled = false } = {}) {
        const launch = current;
        if (!launch) return;
        current = null;
        const ended = { game: launch.game, command: launch.command, cancelled };
        for (const subscriber of subscribers) subscriber.onEnded(ended);
    }

    // The first "prelaunch" listener of the pack (see the header).
    host.on("prelaunch", safeHandler(SCRIPT_NAME, ev => {
        // A launch that never ended ran no game the pack could settle.
        end({ cancelled: true });
        // An External Add-on registered before the pack cancelled it: PinballY never launches it.
        if (ev.defaultPrevented) return;
        for (const take of takers) {
            const startInstead = take(ev);
            if (!startInstead) continue;
            ev.preventDefault();
            ev.stopImmediatePropagation();
            startInstead();
            return;
        }
        const launch = { game: ev.game, command: ev.command, goingAhead: false };
        current = launch;
        for (const subscriber of subscribers) subscriber.onBegan({ game: launch.game, command: launch.command });
        host.setTimeout(safeHandler(SCRIPT_NAME, () => {
            if (current === launch && !launch.goingAhead) end({ cancelled: true });
        }), 0);
    }));
    host.on("launchoverlayshow", safeHandler(SCRIPT_NAME, () => {
        if (current) current.goingAhead = true;
    }));
    for (const type of ["launcherror", "postlaunch"]) host.on(type, safeHandler(SCRIPT_NAME, () => end()));

    return {
        // onBegan({ game, command }); onEnded({ game, command, cancelled }),
        // cancelled when a later script cancelled the launch. Errors are
        // logged under scriptName. Subscribers hear in the order they subscribe.
        subscribe: (scriptName, { onBegan = () => {}, onEnded = () => {} }) => {
            subscribers.push({ onBegan: safeHandler(scriptName, onBegan), onEnded: safeHandler(scriptName, onEnded) });
        },
        // take(ev) at each "prelaunch": a function to start what replaces
        // the launch, which the bracket then cancels, or null to let it go.
        offerTakeover: (scriptName, take) => {
            takers.push(safeHandler(scriptName, take));
        },
        // True from a launch's start to its end.
        isUnderWay: () => current !== null,
    };
}

let sharedBracket = null;

export function getLaunchBracket() {
    if (!sharedBracket) sharedBracket = createLaunchBracket(createPinballYHost());
    return sharedBracket;
}
