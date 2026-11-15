// ============================================================
// Wheel Rail rows: what the rail lists for the wheel shown, top to bottom:
// # then A to Z, or every decade from the oldest to the newest present then
// ? (each decade's years under it with WHEEL_RAIL_YEARS), which hold a table,
// and the row of a table. Built once per reading of the wheel (see wheel_places.js).
// - Year rows shrink from 18 to 13 px, lower only when needed, so that the rail stays within 1100 px.
// - A row is known by its key: two-digit labels repeat a century apart (1984 and 2084).
// ============================================================

import { OTHER_LETTER_PAGE, NO_YEAR_PAGE, WHEEL_PAGINGS } from "../tables/wheel_places.js";
import { decadeOf, yearOf } from "../tables/wheel_order.js";

// Prototype values, in reference px; pad: the panel's margin above and below the rows.
export const RAIL_ROWS = Object.freeze({ pad: 7, maxHeight: 1100 });
const LETTER = Object.freeze({ height: 30, size: 14, weight: 600 });
const DECADE = Object.freeze({ height: 30, size: 12, weight: 600 });
const YEAR = Object.freeze({ size: 10, weight: 400 });
const YEAR_HEIGHT = Object.freeze({ max: 18, min: 13 });
const LETTERS = Object.freeze([OTHER_LETTER_PAGE, ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]);

const twoDigits = number => String(number % 100).padStart(2, "0");
const letterKey = letter => `l:${letter}`;
const yearKey = year => `y:${year}`;
// A decade (1980) or NO_YEAR_PAGE.
const decadeKey = page => `d:${page}`;
// 1980 as 80s, the tables without a year as ?.
const decadeLabel = page => (page === NO_YEAR_PAGE ? NO_YEAR_PAGE : `${twoDigits(page)}s`);

export const isWheelRailYearsOn = config => config.wheelRailYears === true;

function letterRows(pages) {
    return LETTERS.map(letter => Object.freeze({ key: letterKey(letter), label: letter, isLit: pages.has(letter), ...LETTER }));
}

// As high as fits, 18 px at most, 13 px at least unless 13 px would not fit.
function yearHeightFor(room, yearCount) {
    if (yearCount === 0) return YEAR_HEIGHT.max;
    const fitting = Math.floor(room / yearCount);
    return fitting < YEAR_HEIGHT.min ? fitting : Math.min(YEAR_HEIGHT.max, fitting);
}

function decadeRows(pages, tables, withYears) {
    const decades = [...pages].filter(page => page !== NO_YEAR_PAGE);
    const pagesTopDown = [];
    if (decades.length > 0) {
        for (let decade = Math.min(...decades); decade <= Math.max(...decades); decade += 10) pagesTopDown.push(decade);
    }
    pagesTopDown.push(NO_YEAR_PAGE);
    const yearsByDecade = new Map();
    if (withYears) {
        for (const game of tables) {
            const year = yearOf(game);
            if (year === null) continue;
            if (!yearsByDecade.has(decadeOf(year))) yearsByDecade.set(decadeOf(year), new Set());
            yearsByDecade.get(decadeOf(year)).add(year);
        }
    }
    const yearCount = [...yearsByDecade.values()].reduce((sum, years) => sum + years.size, 0);
    const yearHeight = yearHeightFor(RAIL_ROWS.maxHeight - 2 * RAIL_ROWS.pad - pagesTopDown.length * DECADE.height, yearCount);
    const rows = [];
    for (const page of pagesTopDown) {
        rows.push(Object.freeze({ key: decadeKey(page), label: decadeLabel(page), isLit: pages.has(page), ...DECADE }));
        const years = yearsByDecade.get(page);
        if (!years) continue;
        for (const year of [...years].sort((a, b) => a - b)) {
            rows.push(Object.freeze({ key: yearKey(year), label: twoDigits(year), isLit: true, height: yearHeight, ...YEAR }));
        }
    }
    return rows;
}

export function createRailRows(wheelPlaces, { withYears }) {
    // The pages of the last reading the rows were built from: the same Set until the wheel is read again.
    let builtFrom = null;
    let rows = null;

    function current() {
        const pages = wheelPlaces.getPages();
        if (pages === builtFrom) return rows;
        builtFrom = pages;
        const paging = wheelPlaces.getPaging();
        if (paging === WHEEL_PAGINGS.BY_LETTER) rows = Object.freeze(letterRows(pages));
        else if (paging === WHEEL_PAGINGS.BY_DECADE) rows = Object.freeze(decadeRows(pages, wheelPlaces.getTables(), withYears));
        else rows = null;
        return rows;
    }

    return {
        // The rows top to bottom, each { key, label, isLit, height, size, weight }; null on a ranked selection.
        getRows: current,
        // The key of the game's row: its letter, its year (with years) or its decade.
        keyOf(game) {
            const page = wheelPlaces.pageOf(game);
            if (wheelPlaces.getPaging() !== WHEEL_PAGINGS.BY_DECADE) return letterKey(page);
            const year = yearOf(game);
            return withYears && year !== null ? yearKey(year) : decadeKey(page);
        },
    };
}
