// ============================================================
// Wheel Order module: the order the wheel lists the Active Filter's tables
// in, alphabetical or by year, and the sorted copy's source, both saved in
// cabinet.json. Gives the compare and page groups the pack's filters sort
// and page with, and the chosen filter. start() creates the sorted copy, puts
// the saved order on the filter PinballY restored, and logs the cabinet checks.
// - By year, a PinballY or other script's filter choice is cancelled and its sorted copy shown instead.
// - The pack's own filters are never copied: switching the order runs the active one again.
// - With the Wheel Order Add-on off, the order is always alphabetical.
// - An unknown order, or an unreadable or gone source, is logged as an error: alphabetical, or All, instead.
// ============================================================

import config from "../core/config.js";
import { ALL_TABLES_FILTER, createPinballYHost } from "../core/pinbally_host.js";
import { safeHandler } from "../core/safe_handler.js";
import { logInfo } from "../core/info_log.js";
import { logError } from "../core/error_log.js";
import { getProfileStore } from "../profiles/profile_store.js";

const SCRIPT_NAME = "WheelOrder";

export const WHEEL_ORDERS = Object.freeze({ ALPHABETICAL: "alphabetical", BY_YEAR: "byYear" });
// The cabinet.json keys; pinned in tests/project/persisted_data_pinning.test.js.
const CABINET_KEY = "wheelOrder";
const SOURCE_CABINET_KEY = "wheelOrderSource";
// The sorted copy standing in for the Active Filter while by year.
const COPY_ID = "project.WheelOrder";
const COPY_FULL_ID = `User.${COPY_ID}`;
const PACK_FILTER_PREFIX = "User.project.";
const UNCOPIED_FILTERS = ["Hidden", "Unconfigured"];
// The titles the alphabetical order check logs from each list.
const ALPHABETICAL_CHECK_TITLES = 12;

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

// Next / Previous Page groups. Group 0 makes the wheel skip the table, so
// none is 0: a decade is its first year, the tables without a year one last
// group after every decade.
const NO_YEAR_PAGE_GROUP = 100000;
const decadeOf = year => Math.floor(year / 10) * 10;

export function pageGroupByYear(game) {
    const year = yearOf(game);
    return year === null ? NO_YEAR_PAGE_GROUP : decadeOf(year);
}

const firstLetterOf = game => String(game.title ?? "").charAt(0);

// Like PinballY's default grouping (FilterInfo.html): the Unicode code of the title's first letter.
function pageGroupByLetter(game) {
    const first = firstLetterOf(game);
    return first === "" ? 1 : first.codePointAt(0);
}

// The page group as the Info Log names it.
function pageGroupLabel(game, isByYear) {
    if (!isByYear) return `letter ${firstLetterOf(game)}`;
    const group = pageGroupByYear(game);
    return group === NO_YEAR_PAGE_GROUP ? "no year" : `the ${group}s`;
}

const PAGE_COMMANDS = Object.freeze({ NextPage: "Next Page", PrevPage: "Previous Page" });

// isEnabled: whether the Wheel Order Add-on is on.
export function createWheelOrder(host, profileStore, { isEnabled }) {
    function readSavedOrder() {
        const saved = profileStore.getCabinetData()[CABINET_KEY];
        if (saved === undefined) return WHEEL_ORDERS.ALPHABETICAL;
        if (Object.values(WHEEL_ORDERS).includes(saved)) return saved;
        logError(SCRIPT_NAME, `ERROR unknown Wheel Order ${JSON.stringify(saved)} in cabinet.json; alphabetical instead.`, host);
        return WHEEL_ORDERS.ALPHABETICAL;
    }

    // Why the copy cannot take this saved source, null when it can: not a
    // filter it copies, or one PinballY no longer knows, which may give
    // nothing back or throw (the help says neither).
    function sourceProblemOf(saved) {
        if (typeof saved !== "string") return "unreadable";
        if (!isCopied(saved)) return "not a copied filter";
        try {
            const info = host.getFilterInfo(saved);
            return info && typeof info.testGame === "function" ? null : "unknown to PinballY";
        } catch (error) {
            return `unknown to PinballY (${error.message})`;
        }
    }

    // The copy's source the last session saved, All Tables when there is
    // none; one it cannot take is logged and All Tables taken instead.
    function readSavedSource() {
        const saved = profileStore.getCabinetData()[SOURCE_CABINET_KEY];
        if (saved === undefined) return ALL_TABLES_FILTER;
        const problem = sourceProblemOf(saved);
        if (problem === null) return saved;
        logError(SCRIPT_NAME, `ERROR Wheel Order source ${JSON.stringify(saved)} in cabinet.json ${problem}; All instead.`, host);
        return ALL_TABLES_FILTER;
    }

    let order = readSavedOrder();
    // Set by start(): the sorted copy is created and its listeners installed.
    let isStarted = false;
    // The filter the sorted copy selects the tables of, while by year; saved
    // in cabinet.json each time it changes.
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
    const isSelfSorting = filterId => filterId !== COPY_FULL_ID && filterId.startsWith(PACK_FILTER_PREFIX);
    const isCopied = filterId => filterId !== COPY_FULL_ID && !isSelfSorting(filterId)
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

    // Cabinet check, once a start while alphabetical: whether PinballY's
    // default order is localeCompare on the title. All Tables as the wheel
    // shows it when it is the Active Filter (rotated to the pack's first
    // table), as its getGames() gives it otherwise.
    function checkAlphabeticalOrder() {
        if (isByYear()) return;
        const onWheel = host.getCurrentFilterId() === ALL_TABLES_FILTER;
        const pinballY = onWheel ? host.getWheelTables() : host.getFilterInfo(ALL_TABLES_FILTER).getGames();
        const pack = [...pinballY].sort(compareTitles);
        const start = onWheel && pack.length > 0 ? pinballY.findIndex(game => game.configId === pack[0].configId) : 0;
        const listed = [...pinballY.slice(start), ...pinballY.slice(0, start)];
        const differ = listed.filter((game, index) => game.configId !== pack[index].configId).length;
        const firstTitles = games => games.slice(0, ALPHABETICAL_CHECK_TITLES).map(game => game.title).join(", ");
        logInfo(SCRIPT_NAME, `alphabetical order check, All Tables from ${onWheel ? "the wheel" : "getGames()"}: `
            + `PinballY: ${firstTitles(listed)}; pack: ${firstTitles(pack)}; ${differ} of ${listed.length} places differ.`, host);
    }

    // Runs the Active Filter again, then selects the table that was, when
    // the filter still has it: the help does not say where refreshFilter
    // leaves the wheel.
    function refreshKeepingTable() {
        const current = host.getCurrentTable();
        host.refreshFilter();
        if (!current) return;
        const index = host.getWheelTables().findIndex(game => game.configId === current.configId);
        if (index > 0) host.setWheelGame(index);
    }

    // The copy of this filter becomes the Active Filter, the same table
    // selected when the copy has it (setCurrentFilter keeps it); a new
    // source is saved in cabinet.json for the next start.
    function showCopyOf(filterId) {
        if (profileStore.getCabinetData()[SOURCE_CABINET_KEY] !== filterId) {
            profileStore.updateCabinetData(cabinet => { cabinet[SOURCE_CABINET_KEY] = filterId; });
        }
        sourceId = filterId;
        if (host.getCurrentFilterId() === COPY_FULL_ID) refreshKeepingTable();
        else host.setCurrentFilter(COPY_FULL_ID);
        checkHiddenTables();
    }

    // Puts the Wheel Order on the Active Filter. A pack filter reads it each
    // time it sorts, so it is already in that order at start.
    function applyToActiveFilter() {
        const activeId = host.getCurrentFilterId();
        if (isByYear()) {
            if (activeId === COPY_FULL_ID) showCopyOf(sourceId);
            else if (isCopied(activeId)) showCopyOf(activeId);
        } else if (activeId === COPY_FULL_ID) {
            host.setCurrentFilter(sourceId);
        }
    }

    // Cabinet check: the page group each Next / Previous Page reaches on a
    // filter paging in the Wheel Order (PinballY gives no way to read its own).
    function listenToPageButtons() {
        // The page button just pressed, until the table it reaches is selected.
        let pressedPage = null;
        // PinballY gives no filter's pageGroup back: the compare the host kept,
        // the module's own function, tells a filter created with WHEEL_ORDER_SORT.
        const isPagedInWheelOrder = filterId => filterId === COPY_FULL_ID
            || host.getFilterCompare(filterId) === compareInWheelOrder;
        // Fires before PinballY carries out the button: the turn comes after.
        host.on("commandbuttondown", safeHandler(SCRIPT_NAME, ev => {
            pressedPage = PAGE_COMMANDS[ev.command] !== undefined && host.getUIMode() === "wheel"
                && isPagedInWheelOrder(host.getCurrentFilterId()) ? ev.command : null;
        }));
        // A press that left the wheel in place (a single page group) fires no
        // "gameselect": forgotten before a menu or filter change fires one.
        const forgetPress = safeHandler(SCRIPT_NAME, () => { pressedPage = null; });
        host.on("menuopen", forgetPress);
        host.onGameListEvent("filterselect", forgetPress);
        // Fires once the wheel has turned; never when a single page group leaves it in place.
        host.onGameListEvent("gameselect", safeHandler(SCRIPT_NAME, ev => {
            if (pressedPage === null || !ev.game) return;
            const command = PAGE_COMMANDS[pressedPage];
            pressedPage = null;
            logInfo(SCRIPT_NAME, `${command} on ${getChosenFilterId()}, ${isByYear() ? "by year" : "alphabetical"}: `
                + `${pageGroupLabel(ev.game, isByYear())}, "${ev.game.title}".`, host);
        }));
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
            pageGroup: pageGroupByYear,
        });
        listenToPageButtons();
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
        applyAtStartup();
        checkAlphabeticalOrder();
    }

    // Puts the saved Wheel Order on the filter PinballY restored: the copy
    // takes its saved source again, any other filter is treated as a choice.
    function applyAtStartup() {
        const restoredId = host.getCurrentFilterId();
        // Cabinet check: whether PinballY restores a script filter (the copy) or falls back to All.
        logInfo(SCRIPT_NAME, `filter restored at startup: ${restoredId}, Wheel Order ${get()}.`, host);
        if (restoredId === COPY_FULL_ID) {
            const savedSource = readSavedSource();
            if (isByYear()) showCopyOf(savedSource);
            else host.setCurrentFilter(savedSource);
        } else if (isByYear() && isSelfSorting(restoredId)) {
            // On the next tick, once every Add-on has created its filter:
            // PinballY may have listed this one before the pack sorted it.
            host.setTimeout(safeHandler(SCRIPT_NAME, () => {
                if (host.getCurrentFilterId() === restoredId) refreshKeepingTable();
            }), 0);
        } else {
            applyToActiveFilter();
        }
    }

    const isCopyActive = () => isStarted && host.getCurrentFilterId() === COPY_FULL_ID;
    const getChosenFilterId = () => (isCopyActive() ? sourceId : host.getCurrentFilterId());

    // The filter the player picked: the copy's source while the copy stands
    // in for it, the Active Filter otherwise. isStandIn: the copy is active,
    // so PinballY's own marks name the copy, not this filter.
    function getChosenFilter() {
        if (!isCopyActive()) {
            return {
                id: host.getCurrentFilterId(),
                title: host.getCurrentFilterTitle(),
                groupCmd: host.getCurrentFilterGroupCmd(),
                isStandIn: false,
            };
        }
        const source = host.getFilterInfo(sourceId);
        return { id: sourceId, title: source.title, groupCmd: source.groupCmd, cmd: source.cmd, isStandIn: true };
    }

    return {
        get,
        isByYear,
        start,
        getChosenFilter,
        getChosenFilterId,
        // Switches between alphabetical and by year, saved in cabinet.json at
        // once, and puts it on the Active Filter, the same table selected.
        toggle() {
            order = isByYear() ? WHEEL_ORDERS.ALPHABETICAL : WHEEL_ORDERS.BY_YEAR;
            profileStore.updateCabinetData(cabinet => { cabinet[CABINET_KEY] = order; });
            host.log(`[${SCRIPT_NAME}] Wheel Order: ${order}.`);
            // A pack filter sorts itself: running it again sorts it anew.
            if (isSelfSorting(host.getCurrentFilterId())) refreshKeepingTable();
            else if (isStarted) applyToActiveFilter();
        },
        // The compareForSort of the pack's own filters (spec #513): by year
        // or, like PinballY's default, by title.
        compareForSort: (a, b) => (isByYear() ? compareByYear(a, b) : compareTitles(a, b)),
        // Their pageGroup: by decade or, like PinballY's default, by first letter.
        pageGroup: game => (isByYear() ? pageGroupByYear(game) : pageGroupByLetter(game)),
    };
}

let sharedWheelOrder = null;

export function getWheelOrder() {
    if (!sharedWheelOrder) {
        sharedWheelOrder = createWheelOrder(createPinballYHost(), getProfileStore(), { isEnabled: config.addOns.wheelOrder !== false });
    }
    return sharedWheelOrder;
}

// For the pack's own filters' createFilter: reads the shared Wheel Order
// each time PinballY sorts, so the Add-ons' init order does not matter.
const compareInWheelOrder = (a, b) => getWheelOrder().compareForSort(a, b);
const pageGroupInWheelOrder = game => getWheelOrder().pageGroup(game);
// What the pack's own unranked filters sort and page with.
export const WHEEL_ORDER_SORT = Object.freeze({ compareForSort: compareInWheelOrder, pageGroup: pageGroupInWheelOrder });
