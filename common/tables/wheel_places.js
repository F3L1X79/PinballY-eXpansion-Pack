// ============================================================
// Wheel places: the wheel's tables in the wheel's order, from its first
// table, each one's 1-based place and its page (letter, decade, or none on a
// ranked selection), shared by the status line and the Wheel Guides.
// - Never reads the whole wheel per move (it saturated the wheel): only once told, after a Wheel Order toggle, or out of step.
// - Pages follow the filter shown, never the Wheel Order setting itself (spec #527).
// ============================================================

import { createPinballYHost } from "../core/pinbally_host.js";
import { compareByYear, compareTitles, decadeOf, getWheelOrder, yearOf, WHEEL_ORDER_SORT } from "./wheel_order.js";

export const WHEEL_PAGINGS = Object.freeze({ BY_LETTER: "letter", BY_DECADE: "decade" });
// The page of a title not starting with A-Z, and of a table without a year.
export const OTHER_LETTER_PAGE = "#";
export const NO_YEAR_PAGE = "?";

// The title's first letter once accents are stripped (an accented E is E).
function letterOf(game) {
    const first = String(game.title ?? "").trim().normalize("NFD").charAt(0).toUpperCase();
    return first >= "A" && first <= "Z" ? first : OTHER_LETTER_PAGE;
}

function decadePageOf(game) {
    const year = yearOf(game);
    return year === null ? NO_YEAR_PAGE : decadeOf(year);
}

export function createWheelPlaces(host, wheelOrder) {
    // The last reading of the wheel, null until read or once told it may have changed.
    let reading = null;
    // A toggle can keep the selected and next tables side by side, yet change the pages.
    wheelOrder.onChange(() => { reading = null; });

    // A pack filter sorting in the Wheel Order pages with it, the sorted copy
    // by decade, a filter with no pack sort (PinballY lists it by title) by
    // letter; a pack filter ranking its tables has no pages.
    function pagingOf(compare) {
        if (compare === null) return WHEEL_PAGINGS.BY_LETTER;
        if (compare === compareByYear) return WHEEL_PAGINGS.BY_DECADE;
        if (compare === WHEEL_ORDER_SORT.compareForSort) {
            return wheelOrder.isByYear() ? WHEEL_PAGINGS.BY_DECADE : WHEEL_PAGINGS.BY_LETTER;
        }
        return null;
    }

    // The wheel lists its tables from the current one on, wrapping around:
    // its first table follows the one place where the Active Filter's sort
    // goes backwards.
    function read() {
        const games = host.getWheelTables();
        const compare = host.getFilterCompare(host.getCurrentFilterId());
        const sort = compare ?? compareTitles;
        const first = Math.max(0, games.findIndex((game, index) => index > 0 && sort(games[index - 1], game) > 0));
        const tables = Object.freeze([...games.slice(first), ...games.slice(0, first)]);
        return { tables, places: new Map(tables.map((game, index) => [game.configId, index])), paging: pagingOf(compare) };
    }

    // Whether the selected table and the next one are where the reading has them.
    function isInStep() {
        if (reading === null) return false;
        const count = host.getWheelCount();
        if (reading.tables.length !== count) return false;
        const current = host.getCurrentTable();
        if (!current) return count === 0;
        const place = reading.places.get(current.configId);
        if (place === undefined) return false;
        const next = host.getWheelTableAt(1);
        return Boolean(next) && reading.places.get(next.configId) === (place + 1) % count;
    }

    function current() {
        if (!isInStep()) reading = read();
        return reading;
    }

    return {
        // The wheel's content may have changed (a filter, a menu, a Profile); a Wheel Order toggle needs no notice.
        markChanged() {
            reading = null;
        },
        getTables: () => current().tables,
        // 1-based; 0 for no table or one not on the wheel.
        placeOf(game) {
            const place = game ? current().places.get(game.configId) : undefined;
            return place === undefined ? 0 : place + 1;
        },
        // WHEEL_PAGINGS' value for the wheel shown, null on a ranked selection.
        getPaging: () => current().paging,
        // The letter, the decade (1980) or NO_YEAR_PAGE; null on a ranked selection.
        pageOf(game) {
            const { paging } = current();
            if (paging === WHEEL_PAGINGS.BY_LETTER) return letterOf(game);
            if (paging === WHEEL_PAGINGS.BY_DECADE) return decadePageOf(game);
            return null;
        },
    };
}

let sharedWheelPlaces = null;

export function getWheelPlaces() {
    if (!sharedWheelPlaces) sharedWheelPlaces = createWheelPlaces(createPinballYHost(), getWheelOrder());
    return sharedWheelPlaces;
}
