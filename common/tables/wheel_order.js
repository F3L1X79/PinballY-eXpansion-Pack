// ============================================================
// Wheel Order module: the single place that knows the order the wheel lists
// the Active Filter's tables in, alphabetical or by year. Reads and writes
// it in cabinet.json through the Profile store, and gives the year compare.
// start() creates the sorted copy (User.project.WheelOrder) and listens to "filterselect".
// - By year, a PinballY or other script's filter choice is cancelled and its sorted copy shown instead.
// - With the Wheel Order Add-on off, the order is always alphabetical.
// - An unknown value in cabinet.json is logged and read as alphabetical.
// ============================================================

import config from "../core/config.js";
import { ALL_TABLES_FILTER, createPinballYHost } from "../core/pinbally_host.js";
import { safeHandler } from "../core/safe_handler.js";
import { logInfo } from "../core/info_log.js";
import { getProfileStore } from "../profiles/profile_store.js";

const SCRIPT_NAME = "WheelOrder";

export const WHEEL_ORDERS = Object.freeze({ ALPHABETICAL: "alphabetical", BY_YEAR: "byYear" });
// The cabinet.json key; pinned in tests/project/persisted_data_pinning.test.js.
const CABINET_KEY = "wheelOrder";
// The sorted copy standing in for the Active Filter while by year.
const COPY_ID = "project.WheelOrder";
const COPY_FULL_ID = `User.${COPY_ID}`;
const PACK_FILTER_PREFIX = "User.project.";
const UNCOPIED_FILTERS = ["Hidden", "Unconfigured"];

// A table's release year, null when it has none (missing or not a positive number).
function yearOf(game) {
    const year = Number(game.year);
    return Number.isInteger(year) && year > 0 ? year : null;
}

const compareTitles = (a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""));

// Oldest first, the same year by title; the tables without a year last, by title.
export function compareByYear(a, b) {
    const yearA = yearOf(a);
    const yearB = yearOf(b);
    if (yearA !== yearB) {
        if (yearA === null) return 1;
        if (yearB === null) return -1;
        return yearA - yearB;
    }
    return compareTitles(a, b);
}

// isEnabled: whether the Wheel Order Add-on is on.
export function createWheelOrder(host, profileStore, { isEnabled }) {
    function readSaved() {
        const saved = profileStore.getCabinetData()[CABINET_KEY];
        if (saved === undefined) return WHEEL_ORDERS.ALPHABETICAL;
        if (Object.values(WHEEL_ORDERS).includes(saved)) return saved;
        host.log(`[${SCRIPT_NAME}] Unknown Wheel Order ${JSON.stringify(saved)} in cabinet.json; alphabetical instead.`);
        return WHEEL_ORDERS.ALPHABETICAL;
    }

    let order = readSaved();
    // Set by start(): the sorted copy is created and its listeners installed.
    let isStarted = false;
    // The filter the sorted copy selects the tables of, while by year.
    let sourceId = ALL_TABLES_FILTER;
    // The cabinet checks, each logged once a session.
    let hasCheckedHiddenTables = false;
    let hasCheckedLaterListener = false;
    // The id of a "filterselect" just cancelled, until a later listener hears it.
    let cancelledFilterId = null;

    const get = () => (isEnabled ? order : WHEEL_ORDERS.ALPHABETICAL);
    const isByYear = () => get() === WHEEL_ORDERS.BY_YEAR;

    // PinballY's filters and other scripts' are replaced by the copy; the
    // pack's own sort themselves (spec #513), and PinballY's Hidden and
    // Unconfigured filters show tables the copy never tests.
    const isCopied = filterId => filterId !== COPY_FULL_ID && !filterId.startsWith(PACK_FILTER_PREFIX)
        && !UNCOPIED_FILTERS.includes(filterId);

    // Cabinet check: whether testGame of All leaves the Hidden tables out, as
    // FilterInfo.html says (it keeps them, pinbally-help.md section 2.5); the copy
    // never tests them either way.
    function checkHiddenTables() {
        if (hasCheckedHiddenTables || sourceId !== ALL_TABLES_FILTER) return;
        hasCheckedHiddenTables = true;
        const all = host.getFilterInfo(ALL_TABLES_FILTER);
        const hidden = host.getAllTables().filter(game => game.isHidden);
        const kept = hidden.filter(game => all.testGame(game)).length;
        logInfo(SCRIPT_NAME, `testGame of All keeps ${kept} of ${hidden.length} Hidden tables; `
            + `the copy shows ${host.getWheelTables().length} tables, All's getGames() ${all.getGames().length}.`, host);
    }

    // Cabinet check, once a session: the answer of the later "filterselect" listener.
    function reportLaterListener(received) {
        cancelledFilterId = null;
        hasCheckedLaterListener = true;
        logInfo(SCRIPT_NAME, `a listener registered after the cancelling one ${received ? "received" : "did NOT receive"} the cancelled filterselect.`, host);
    }

    // Runs the copy again for its new source, then selects the table that
    // was, when the copy has it: the help does not say where refreshFilter
    // leaves the wheel.
    function refreshCopyKeepingTable() {
        const current = host.getCurrentTable();
        host.refreshFilter();
        if (!current) return;
        const index = host.getWheelTables().findIndex(game => game.configId === current.configId);
        if (index > 0) host.setWheelGame(index);
    }

    // The copy of this filter becomes the Active Filter, the same table
    // selected when the copy has it (setCurrentFilter keeps it).
    function showCopyOf(filterId) {
        sourceId = filterId;
        if (host.getCurrentFilterId() === COPY_FULL_ID) refreshCopyKeepingTable();
        else host.setCurrentFilter(COPY_FULL_ID);
        checkHiddenTables();
    }

    // Puts the Wheel Order on the Active Filter.
    function applyToActiveFilter() {
        const activeId = host.getCurrentFilterId();
        if (isByYear()) {
            if (activeId === COPY_FULL_ID) showCopyOf(sourceId);
            else if (isCopied(activeId)) showCopyOf(activeId);
        } else if (activeId === COPY_FULL_ID) {
            host.setCurrentFilter(sourceId);
        }
    }

    // Creates the sorted copy and takes the player's filter choices over;
    // once, by the Wheel Order Add-on. copyTitle: the copy's name where
    // PinballY and the menus name the Active Filter.
    function start({ copyTitle }) {
        if (isStarted) return;
        isStarted = true;
        // The source's FilterInfo, read once per run of the copy.
        let source = null;
        host.createFilter({
            id: COPY_ID,
            // No group: never listed in a filter menu.
            title: copyTitle,
            // Fires each time the copy runs, before PinballY scans the tables.
            before: safeHandler(SCRIPT_NAME, () => { source = host.getFilterInfo(sourceId); }),
            // testGame gives null for an invalid game.
            select: game => source !== null && source.testGame(game) === true,
            compareForSort: compareByYear,
        });
        // Fires before a filter the player picked is applied: while by year,
        // it is cancelled and the copy of that filter shown instead, on the
        // next tick: no setCurFilter runs inside PinballY's own dispatch,
        // and every later listener has heard the cancelled event by then.
        host.onGameListEvent("filterselect", safeHandler(SCRIPT_NAME, ev => {
            if (!isByYear() || !isCopied(ev.id)) return;
            ev.preventDefault();
            const filterId = ev.id;
            if (!hasCheckedLaterListener) cancelledFilterId = filterId;
            host.setTimeout(safeHandler(SCRIPT_NAME, () => {
                if (cancelledFilterId !== null) reportLaterListener(false);
                showCopyOf(filterId);
            }), 0);
        }));
        // Registered right after: cabinet check, whether a cancelled
        // "filterselect" still reaches the listeners after ours.
        host.onGameListEvent("filterselect", safeHandler(SCRIPT_NAME, ev => {
            if (cancelledFilterId !== null && ev.id === cancelledFilterId) reportLaterListener(true);
        }));
        applyToActiveFilter();
    }

    return {
        get,
        isByYear,
        start,
        // Switches between alphabetical and by year, saved in cabinet.json at
        // once, and puts it on the Active Filter, the same table selected.
        toggle() {
            order = isByYear() ? WHEEL_ORDERS.ALPHABETICAL : WHEEL_ORDERS.BY_YEAR;
            profileStore.updateCabinetData(cabinet => { cabinet[CABINET_KEY] = order; });
            host.log(`[${SCRIPT_NAME}] Wheel Order: ${order}.`);
            if (isStarted) applyToActiveFilter();
        },
    };
}

let sharedWheelOrder = null;

export function getWheelOrder() {
    if (!sharedWheelOrder) {
        sharedWheelOrder = createWheelOrder(createPinballYHost(), getProfileStore(), { isEnabled: config.addOns.wheelOrder !== false });
    }
    return sharedWheelOrder;
}
