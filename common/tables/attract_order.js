// ============================================================
// Attract Order module: how attract mode moves through the tables (As PinballY,
// In Order, Whole Wheel), started by the Wheel Order Add-on. In Order and Whole
// Wheel, the pack takes PinballY's switches over: one animated move per kept
// interval, from an unprevented "attractmodestart" to "attractmodeend", the
// next table or a fast jump through a new shuffle. Logs the cabinet checks.
// - saveAttractOrderSwitches (from the Settings) writes PinballY's option: PinballY reads it only at its start.
// - The pack switches only while that option holds the long value, else PinballY switches too.
// - Never calls optionSettings.save(): PinballY saves its dirty settings before quitting.
// ============================================================

import config from "../core/config.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { safeHandler } from "../core/safe_handler.js";
import { logInfo } from "../core/info_log.js";
import { getProfileStore } from "../profiles/profile_store.js";

const SCRIPT_NAME = "AttractOrder";

export const ATTRACT_ORDERS = Object.freeze({ PINBALLY: "pinballY", IN_ORDER: "inOrder", WHOLE_WHEEL: "wholeWheel" });
// PinballY's "Switch games every (seconds)": the key is not in the help, to check on the cabinet.
export const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
// One day: PinballY then never switches on its own.
export const LONG_SWITCH_TIME = 86400;
// What PinballY switches with when its option was never written.
const PINBALLY_DEFAULT_SWITCH_TIME = 5;
// PinballY's own value while the pack switches; pinned in tests/project/persisted_data_pinning.test.js.
const KEPT_SWITCH_TIME_KEY = "attractOrderSwitchTime";

// An Attract Order the pack does not know is As PinballY.
const isPackSwitching = order => order === ATTRACT_ORDERS.IN_ORDER || order === ATTRACT_ORDERS.WHOLE_WHEEL;

const isSwitchTime = value => Number.isInteger(value) && value > 0;

// Fisher-Yates, through the host's draw.
function shuffle(host, items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(host.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// The wheel's tables by configId in a new order for Whole Wheel. The table on
// screen is left out of a new attract mode's first shuffle (already shown),
// and never first in the next ones.
// The wheel's tables by configId, the one on screen first.
const wheelConfigIds = host => host.getWheelTables().map(game => game.configId);

function shuffleWheel(host, { includeOnScreen }) {
    const [onScreen, ...others] = wheelConfigIds(host);
    const shuffled = shuffle(host, others);
    if (!includeOnScreen || onScreen === undefined) return shuffled;
    const at = 1 + Math.floor(host.random() * shuffled.length);
    return [...shuffled.slice(0, at), onScreen, ...shuffled.slice(at)];
}

// Called once the Settings saved the Attract Order from one value to the
// other: PinballY's own interval is kept in cabinet.json and the long value
// written in its place, or the kept one given back.
export function saveAttractOrderSwitches(host, profileStore, from, to) {
    const kept = profileStore.getCabinetData()[KEPT_SWITCH_TIME_KEY];
    if (!isPackSwitching(to)) {
        if (kept === undefined) return;
        host.settings.set(SWITCH_TIME_KEY, kept);
        profileStore.updateCabinetData(cabinet => { delete cabinet[KEPT_SWITCH_TIME_KEY]; });
        host.log(`[${SCRIPT_NAME}] ${SWITCH_TIME_KEY} given back to PinballY: ${kept}.`);
        return;
    }
    if (isPackSwitching(from)) return;
    const current = host.settings.getInt(SWITCH_TIME_KEY, PINBALLY_DEFAULT_SWITCH_TIME);
    // The long value already there is the pack's own, never PinballY's interval.
    if (isSwitchTime(current) && current !== LONG_SWITCH_TIME) {
        profileStore.updateCabinetData(cabinet => { cabinet[KEPT_SWITCH_TIME_KEY] = current; });
    }
    host.settings.set(SWITCH_TIME_KEY, LONG_SWITCH_TIME);
    host.log(`[${SCRIPT_NAME}] ${SWITCH_TIME_KEY} kept (${current}), ${LONG_SWITCH_TIME} written for the next start.`);
}

// order: the Attract Order this session runs with.
export function createAttractOrder(host, profileStore, { order }) {
    let isStarted = false;
    // The step timer while the pack switches, and the tick that starts it.
    let switchTimer = null;
    let startTimer = null;
    let hasReportedPinballYSwitch = false;
    // Whole Wheel: the configIds of this attract mode's shuffle not shown yet.
    let stillToShow = [];

    function stopSwitching() {
        if (startTimer !== null) host.clearTimeout(startTimer);
        if (switchTimer !== null) host.clearInterval(switchTimer);
        startTimer = null;
        switchTimer = null;
    }

    // In Order: the wrap after the last table is the wheel's own.
    function switchTable() {
        const configIds = wheelConfigIds(host);
        if (configIds.length < 2) return;
        if (order !== ATTRACT_ORDERS.WHOLE_WHEEL) {
            host.setWheelGame(1, { animate: true });
            return;
        }
        // A table the wheel no longer shows (a filter changed), or the one on
        // screen, is skipped. Bounded, never a frozen timer: tables sharing a
        // configId could make every draw land on the one on screen.
        let offset = -1;
        for (let tries = 0; offset <= 0 && tries < 2 * configIds.length + 1; tries++) {
            if (stillToShow.length === 0) stillToShow = shuffleWheel(host, { includeOnScreen: true });
            offset = configIds.indexOf(stillToShow.shift());
        }
        if (offset <= 0) offset = 1;
        host.setWheelGame(offset, { animate: true, fast: true });
    }

    function listenToAttractMode(intervalSeconds) {
        // Fires when the cabinet sits idle; a drawn screen may prevent it.
        host.on("attractmodestart", safeHandler(SCRIPT_NAME, ev => {
            stopSwitching();
            if (ev.defaultPrevented) return;
            // On the next tick: a listener after this one may still hold attract mode off.
            startTimer = host.setTimeout(safeHandler(SCRIPT_NAME, () => {
                startTimer = null;
                if (host.getUIMode() !== "attract") return;
                stillToShow = order === ATTRACT_ORDERS.WHOLE_WHEEL ? shuffleWheel(host, { includeOnScreen: false }) : [];
                switchTimer = host.setInterval(safeHandler(SCRIPT_NAME, switchTable), intervalSeconds * 1000);
            }), 0);
        }));
        // Fires on the button press that ends attract mode.
        host.on("attractmodeend", safeHandler(SCRIPT_NAME, stopSwitching));
        // Cabinet check: the pack's moves fire no "gameselect", so one in
        // attract mode while it switches is PinballY's own switch.
        host.onGameListEvent("gameselect", safeHandler(SCRIPT_NAME, () => {
            if (hasReportedPinballYSwitch || switchTimer === null || host.getUIMode() !== "attract") return;
            hasReportedPinballYSwitch = true;
            logInfo(SCRIPT_NAME, "PinballY still switches: a gameselect in attract mode the pack did not cause.", host);
        }));
    }

    // Once, by the Wheel Order Add-on: As PinballY does nothing at all.
    function start() {
        if (isStarted) return;
        isStarted = true;
        const switchTime = host.settings.getInt(SWITCH_TIME_KEY, PINBALLY_DEFAULT_SWITCH_TIME);
        // Cabinet check: the key PinballY's option is read under, and its value.
        logInfo(SCRIPT_NAME, `${SWITCH_TIME_KEY} read at startup: ${host.settings.getString(SWITCH_TIME_KEY)}, Attract Order ${order}.`, host);
        if (!isPackSwitching(order) || switchTime !== LONG_SWITCH_TIME) return;
        const kept = profileStore.getCabinetData()[KEPT_SWITCH_TIME_KEY];
        if (!isSwitchTime(kept)) return;
        host.log(`[${SCRIPT_NAME}] Attract Order ${order}: the pack switches every ${kept} s.`);
        listenToAttractMode(kept);
    }

    return { start };
}

let sharedAttractOrder = null;

export function getAttractOrder() {
    if (!sharedAttractOrder) {
        sharedAttractOrder = createAttractOrder(createPinballYHost(), getProfileStore(), { order: config.attractOrder });
    }
    return sharedAttractOrder;
}
