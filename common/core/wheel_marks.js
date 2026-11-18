// ============================================================
// Wheel Mark: when the wheel's marks (Mastery Bar, Rating Plate) show. Merges
// "gameselect", the Attract Order's moves, a Profile switch, "gamestarted",
// attract mode and "wheelmode" into one show(game) or hide() per registered
// mark: hidden with no table, during a game and in attract mode.
// - Listens from start(), called by main.js after every Add-on: the Challenge Card and the next Profile's Ratings are ready first.
// - Marks are told in the order they register (the Add-ons' order in main.js).
// ============================================================

import { safeHandler } from "./safe_handler.js";
import { createPinballYHost } from "./pinbally_host.js";
import { isInAttractMode, onAttractModeStarted } from "./attract_mode.js";
import { getAttractOrder } from "../tables/attract_order.js";
import { getProfileStore } from "../profiles/profile_store.js";

const SCRIPT_NAME = "WheelMarks";

export function createWheelMarks(host, { attractOrder, profileStore }) {
    // Each: { show(game, { returned }), hide({ returned }) }, guarded under its script's name.
    const marks = [];
    let isListening = false;
    // From "gamestarted" to "wheelmode", not the Launch Bracket's launch:
    // the marks stay hidden until the wheel is back, after "postlaunch".
    let gameRunning = false;

    // returned: back on the wheel after a game, a menu, a dialog or attract mode.
    function tell(mark, game, returned) {
        if (gameRunning || !game || isInAttractMode(host)) mark.hide({ returned });
        else mark.show(game, { returned });
    }
    const tellAll = (game, returned = false) => { for (const mark of marks) tell(mark, game, returned); };
    const hideAll = () => { for (const mark of marks) mark.hide({ returned: false }); };
    const tellAllCurrent = () => tellAll(host.getCurrentTable());

    function start() {
        if (isListening) return;
        isListening = true;
        // Fires on the player's moves and PinballY's own attract switches; the
        // Attract Order's moves fire none and come through onMove.
        host.onGameListEvent("gameselect", safeHandler(SCRIPT_NAME, ev => tellAll(ev.game)));
        attractOrder.onMove(safeHandler(SCRIPT_NAME, game => tellAll(game)));
        host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
            gameRunning = true;
            hideAll();
        }));
        onAttractModeStarted(host, SCRIPT_NAME, hideAll);
        host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
            gameRunning = false;
            tellAll(host.getCurrentTable(), true);
        }));
        profileStore.onSwitch(safeHandler(SCRIPT_NAME, tellAllCurrent));
    }

    return {
        start,
        // mark: { show(game, { returned }), hide({ returned }) }, told at once for the
        // table on screen; its errors are logged under scriptName. refresh()
        // tells it again, for a change only its Add-on hears of.
        register(scriptName, { show, hide }) {
            const mark = { show: safeHandler(scriptName, show), hide: safeHandler(scriptName, hide) };
            marks.push(mark);
            tell(mark, host.getCurrentTable(), false);
            return { refresh: () => tell(mark, host.getCurrentTable(), false) };
        },
    };
}

let sharedMarks = null;

export function getWheelMarks() {
    if (!sharedMarks) sharedMarks = createWheelMarks(createPinballYHost(), { attractOrder: getAttractOrder(), profileStore: getProfileStore() });
    return sharedMarks;
}
