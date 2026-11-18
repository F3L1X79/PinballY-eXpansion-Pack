// ============================================================
// Wheel places: the wheel's tables in the wheel's order, from its first
// table, each one's 1-based place and its page (letter, decade, or none on a
// ranked selection), shared by the status line and the Wheel Guides.
// - Never reads the whole wheel per move (it saturated the wheel): only once told, after a Wheel Order toggle, or out of step.
// - Pages follow the filter shown, never the Wheel Order setting itself (spec #527): a Pack Filter says how it pages.
// ============================================================

import { createPinballYHost } from "../core/pinbally_host.js";
import { compareByYear, compareTitles, decadeOf, getWheelOrder, yearOf } from "./wheel_order.js";
import { packFilterSortOf, PACK_FILTER_PAGINGS } from "./pack_filter.js";

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

function pageUnder(paging, game) {
    if (paging === WHEEL_PAGINGS.BY_LETTER) return letterOf(game);
    if (paging === WHEEL_PAGINGS.BY_DECADE) return decadePageOf(game);
    return null;
}

export function createWheelPlaces(host, wheelOrder) {
    // The last reading of the wheel, null until read or once told it may have changed.
    let reading = null;
    // A toggle can keep the selected and next tables side by side, yet change the pages.
    wheelOrder.onChange(() => { reading = null; });

    // How the Active Filter sorts and pages: a Pack Filter as it declares
    // (in the Wheel Order, or ranked without pages), the sorted copy by
    // decade, any other filter (PinballY lists it by title) by letter.
    function sortingOf(filterId) {
        const packSort = packFilterSortOf(filterId);
        if (packSort !== null) {
            const byWheelOrder = wheelOrder.isByYear() ? WHEEL_PAGINGS.BY_DECADE : WHEEL_PAGINGS.BY_LETTER;
            return { compare: packSort.compareForSort, paging: packSort.paging === PACK_FILTER_PAGINGS.RANKED ? null : byWheelOrder };
        }
        if (wheelOrder.isSortedCopy(filterId)) return { compare: compareByYear, paging: WHEEL_PAGINGS.BY_DECADE };
        return { compare: compareTitles, paging: WHEEL_PAGINGS.BY_LETTER };
    }

    // The wheel lists its tables from the current one on, wrapping around:
    // its first table follows the one place where the Active Filter's sort
    // goes backwards.
    function read() {
        const games = host.getWheelTables();
        const { compare, paging } = sortingOf(host.getCurrentFilterId());
        const first = Math.max(0, games.findIndex((game, index) => index > 0 && compare(games[index - 1], game) > 0));
        const tables = Object.freeze([...games.slice(first), ...games.slice(0, first)]);
        // pages: taken from the tables the first time asked.
        return { tables, places: new Map(tables.map((game, index) => [game.configId, index])), paging, pages: null };
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
        pageOf: game => pageUnder(current().paging, game),
        // The pages holding a table, as pageOf gives them; the same Set
        // until the wheel is read again. Empty on a ranked selection.
        getPages() {
            const reading = current();
            if (reading.pages === null) {
                reading.pages = reading.paging === null ? new Set() : new Set(reading.tables.map(game => pageUnder(reading.paging, game)));
            }
            return reading.pages;
        },
    };
}

let sharedWheelPlaces = null;

export function getWheelPlaces() {
    if (!sharedWheelPlaces) sharedWheelPlaces = createWheelPlaces(createPinballYHost(), getWheelOrder());
    return sharedWheelPlaces;
}
