// ============================================================
// Wheel Guides: marks on the wheel screen saying where the player is on the wheel: the
// Wheel Rail (WHEEL_RAIL), the Wheel Position (WHEEL_POSITION), the Favorite Heart (FAVORITE_HEART).
// A Wheel Mark (common/core/wheel_marks.js); the wheel is read again after a
// filter choice, a menu, a Wheel Order toggle, a Profile switch and the return to the wheel.
// - "filterselect" fires before the filter applies, and "menuclose" before a table leaves Favorite Tables: read at 0 and 300 ms.
// - Shown under menus and drawn screens; those re-reads go through the module, so none shows over a game.
// - The Wheel Rail's rest waits for the Startup Screen to close (or a game, or attract mode).
// ============================================================

import config from "../common/core/config.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { logInfo } from "../common/core/info_log.js";
import { onStartupScreenClosed, willStartupScreenClose } from "../common/core/startup_screen.js";
import { getWheelMarks } from "../common/core/wheel_marks.js";
import { getWheelOrder } from "../common/tables/wheel_order.js";
import { getWheelPlaces } from "../common/tables/wheel_places.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { createWheelPosition, isWheelPositionOn } from "../common/wheel_guides/wheel_position.js";
import { createFavoriteHeart, isFavoriteHeartOn } from "../common/wheel_guides/favorite_heart.js";
import { createWheelRail, isWheelRailOn } from "../common/wheel_guides/wheel_rail.js";
import { createRailRows, isWheelRailYearsOn } from "../common/wheel_guides/rail_rows.js";

const SCRIPT_NAME = "WheelGuides";
const REREAD_DELAYS_MS = [0, 300];
// PinballY's own filter id for Favorite Tables.
const FAVORITES_FILTER = "Favorites";
// How long after "menuclose" the cabinet check reads Favorite Tables again.
const FAVORITES_CHECK_DELAY_MS = 300;
// PinballY's favourite commands, their menu entries and the flag each sets.
const FAVORITE_COMMANDS = Object.freeze([
    { name: "AddFavorite", entry: "Add to Favorites", isFavorite: true },
    { name: "RemoveFavorite", entry: "Remove from Favorites", isFavorite: false },
]);

export default function init() {
    const host = createPinballYHost();
    const position = isWheelPositionOn(config) ? createWheelPosition(host) : null;
    const heart = isFavoriteHeartOn(config) ? createFavoriteHeart(host) : null;
    const rail = isWheelRailOn(config) ? createWheelRail(host, getDrawingAhead(), { restSeconds: config.wheelRailSeconds }) : null;
    if (!position && !heart && !rail) return;
    const wheelPlaces = getWheelPlaces();

    function hideAll() {
        if (position) position.hide();
        if (heart) heart.hide();
        if (rail) rail.hide();
    }
    const railRows = rail ? createRailRows(wheelPlaces, { withYears: isWheelRailYearsOn(config) }) : null;
    // No rail on a ranked selection.
    function showRail(game) {
        const rows = railRows.getRows();
        if (rows === null) rail.hide();
        else rail.show(rows, railRows.keyOf(game), game.id);
    }
    function showTable(game) {
        if (position) {
            const place = wheelPlaces.placeOf(game);
            if (place === 0) position.hide();
            else position.show(place, wheelPlaces.getTables().length);
        }
        if (heart) heart.show(game.isFavorite === true);
        if (rail) showRail(game);
    }
    // The Wheel Mark module says whether to show the table on screen.
    const showCurrent = () => mark.refresh();
    const readAgain = () => {
        wheelPlaces.markChanged();
        showCurrent();
    };
    const readAgainSoon = () => {
        for (const delay of REREAD_DELAYS_MS) host.setTimeout(safeHandler(SCRIPT_NAME, readAgain), delay);
    };

    // Cabinet check: whether PinballY refreshes Favorite Tables once the
    // player takes the selected table out of them there. The table and
    // the count are taken when the menu opens, before the removal; by year,
    // on the sorted copy of Favorite Tables.
    let favoritesAtMenuOpen = null;
    function noteFavoritesAtMenuOpen() {
        const selected = host.getCurrentTable();
        favoritesAtMenuOpen = getWheelOrder().getChosenFilterId() === FAVORITES_FILTER && selected && selected.isFavorite === true
            ? { selected, count: host.getWheelCount(), filterId: host.getCurrentFilterId() }
            : null;
    }
    function checkFavoritesRefresh() {
        const before = favoritesAtMenuOpen;
        favoritesAtMenuOpen = null;
        if (!before || before.selected.isFavorite === true) return;
        const countAtClose = host.getWheelCount();
        host.setTimeout(safeHandler(SCRIPT_NAME, () => {
            const countLater = host.getWheelCount();
            logInfo(SCRIPT_NAME, `"${before.selected.title}" taken out of Favorite Tables while shown there (${before.filterId}): ${before.count} tables at "menuopen", `
                + `${countAtClose} at "menuclose", ${countLater} ${FAVORITES_CHECK_DELAY_MS} ms later `
                + `(${countLater < before.count ? "refreshed" : "not refreshed"}).`, host);
        }), FAVORITES_CHECK_DELAY_MS);
    }

    // Cabinet check: whether the favourite flag already has its new value at
    // "menuclose" after a favourite command, which runs after its "command" event.
    let favoriteCommand = null;
    function noteFavoriteCommand(ev) {
        const found = FAVORITE_COMMANDS.find(({ name }) => host.getBuiltInCommand(name) === ev.id);
        const selected = host.getCurrentTable();
        if (found && selected) favoriteCommand = { ...found, selected };
    }
    function checkFavoriteFlag() {
        const noted = favoriteCommand;
        favoriteCommand = null;
        if (!noted) return;
        const flag = noted.selected.isFavorite === true;
        logInfo(SCRIPT_NAME, `"${noted.entry}" on "${noted.selected.title}": isFavorite is ${flag} at "menuclose" `
            + `(${flag === noted.isFavorite ? "the new value" : "still the old value"}).`, host);
    }

    // The rail's rest starts once the player has the wheel: the Startup
    // Screen closed, or a game or attract mode dropping it, which closes nothing.
    if (rail && willStartupScreenClose()) {
        rail.hold();
        onStartupScreenClosed(safeHandler(SCRIPT_NAME, rail.release));
    }
    // Back on the wheel or after a Profile switch, the wheel is read again;
    // a switch can also re-run a Profile's filter, which then shows other tables.
    function readOnNews({ returned, switched }) {
        if (returned || switched) wheelPlaces.markChanged();
        if (switched) readAgainSoon();
    }
    const mark = getWheelMarks().register(SCRIPT_NAME, {
        show: (game, context) => {
            readOnNews(context);
            showTable(game);
        },
        hide: context => {
            readOnNews(context);
            if (context.wheelLeft && rail) rail.release();
            hideAll();
        },
    });

    host.onGameListEvent("filterselect", safeHandler(SCRIPT_NAME, readAgainSoon));
    host.on("menuopen", safeHandler(SCRIPT_NAME, () => {
        // A favourite command left without a "menuclose" never answers another menu's check.
        favoriteCommand = null;
        noteFavoritesAtMenuOpen();
    }));
    host.on("command", safeHandler(SCRIPT_NAME, noteFavoriteCommand));
    // A table added to or taken out of Favorite Tables, or hidden, from the menu.
    host.on("menuclose", safeHandler(SCRIPT_NAME, () => {
        checkFavoritesRefresh();
        checkFavoriteFlag();
        readAgainSoon();
    }));
    // The toggle fires neither "filterselect" nor "menuclose"; the shared
    // reading already knows the order changed.
    getWheelOrder().onChange(safeHandler(SCRIPT_NAME, showCurrent));
}
