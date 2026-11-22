// ============================================================
// Wheel Mark: when the wheel's marks (Wheel Guides, Challenge Card, Household
// Challenge Card, Mastery Bar, Rating Plate) show, and where the top right
// stack's pieces sit. Merges "gameselect", the Attract Order's moves, a Profile
// switch, "gamestarted", attract mode and "wheelmode" into one show(game) or hide() per mark.
// - Listens and first tells from start(), called by main.js after every Add-on: their own listeners hear first.
// - Told in the stack's order (cards, bar, plate), then the other marks as they register.
// ============================================================

import config from "./config.js";
import { safeHandler } from "./safe_handler.js";
import { createPinballYHost } from "./pinbally_host.js";
import { isInAttractMode, onAttractModeStarted } from "./attract_mode.js";
import { getAttractOrder } from "../tables/attract_order.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { TOP_RIGHT_STACK, createTopRightStack } from "../drawing/top_right_stack.js";

const SCRIPT_NAME = "WheelMarks";
// The top right stack's marks are told first, in this order: the card's
// height is the bar's to read. The other marks follow, as they register.
const TELL_ORDER = [TOP_RIGHT_STACK.CHALLENGE_CARD, TOP_RIGHT_STACK.HOUSEHOLD_CHALLENGE_CARD, TOP_RIGHT_STACK.MASTERY_BAR, TOP_RIGHT_STACK.RATING_PLATE];

// underBadge: the Profile badge sits above the top right stack.
export function createWheelMarks(host, { attractOrder, profileStore, underBadge = false }) {
    const stack = createTopRightStack({ underBadge });
    // Each: { rank, showsWithoutTable, show, hide }, guarded under its script's name.
    const marks = [];
    let isListening = false;
    // From "gamestarted" to "wheelmode", not the Launch Bracket's launch:
    // the marks stay hidden until the wheel is back, after "postlaunch".
    let gameRunning = false;

    // The context each mark is told with: returned, back on the wheel after a
    // game, a menu, a dialog or attract mode; switched, after a Profile switch;
    // wheelLeft, hidden because a game runs or attract mode is on.
    function tell(mark, game, { returned = false, switched = false } = {}) {
        const wheelLeft = gameRunning || isInAttractMode(host);
        if (wheelLeft || (!game && !mark.showsWithoutTable)) mark.hide({ returned, switched, wheelLeft });
        else mark.show(game || null, { returned, switched });
    }
    const tellAll = (game, context) => { for (const mark of marks) tell(mark, game, context); };
    const tellAllCurrent = context => tellAll(host.getCurrentTable(), context);
    const hideAll = () => { for (const mark of marks) mark.hide({ returned: false, switched: false, wheelLeft: true }); };

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
            tellAllCurrent({ returned: true });
        }));
        // After every Add-on's own switch listener: Profile Ratings has put
        // the next Profile's Ratings and favourites on PinballY's columns.
        profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => tellAllCurrent({ switched: true })));
        tellAllCurrent();
    }

    return {
        start,
        // What that piece of the top right stack adds to it while it takes room, in reference px; 0 without it.
        addedToStackBy: place => stack.addedBy(place),
        // show(game, { returned, switched }), hide({ returned, switched, wheelLeft }):
        // told from start() for the table on screen, errors logged under
        // scriptName. showsWithoutTable: shown with a null game rather than hidden.
        // topRight: { place, margins, height() }, its piece of the top right stack.
        // refresh() tells it again, for a change only its Add-on hears of;
        // top(), only with topRight, is where its piece of the stack sits.
        register(scriptName, { show, hide, showsWithoutTable = false, topRight = null }) {
            const rank = topRight ? TELL_ORDER.indexOf(topRight.place) : TELL_ORDER.length;
            const mark = { rank, showsWithoutTable, show: safeHandler(scriptName, show), hide: safeHandler(scriptName, hide) };
            const after = marks.findIndex(other => other.rank > rank);
            marks.splice(after < 0 ? marks.length : after, 0, mark);
            if (topRight) stack.add(topRight.place, topRight);
            if (isListening) tell(mark, host.getCurrentTable());
            const handle = { refresh: () => tell(mark, host.getCurrentTable()) };
            if (topRight) handle.top = () => stack.topOf(topRight.place);
            return handle;
        },
    };
}

let sharedMarks = null;

export function getWheelMarks() {
    if (!sharedMarks) {
        sharedMarks = createWheelMarks(createPinballYHost(), {
            attractOrder: getAttractOrder(),
            profileStore: getProfileStore(),
            // The badge is the Profile picker's, not a mark.
            underBadge: config.addOns.profilePicker !== false,
        });
    }
    return sharedMarks;
}
