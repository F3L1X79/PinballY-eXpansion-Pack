// ============================================================
// Wheel Guides: marks on the wheel screen saying where the player is on the
// wheel, for now the Wheel Position (WHEEL_POSITION). They follow "gameselect"
// and the Attract Order's moves; the wheel is read again after a filter choice,
// a menu, a Wheel Order toggle, a Profile switch and "wheelmode".
// - "filterselect" fires before the filter applies, and "menuclose" before a table leaves Favorite Tables: read at 0 and 300 ms.
// - Hidden from "gamestarted" to "wheelmode"; shown under menus, drawn screens and in attract mode.
// ============================================================

import config from "../common/core/config.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { logInfo } from "../common/core/info_log.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getAttractOrder } from "../common/tables/attract_order.js";
import { getWheelOrder } from "../common/tables/wheel_order.js";
import { getWheelPlaces } from "../common/tables/wheel_places.js";
import { createWheelPosition, isWheelPositionOn } from "../common/wheel_guides/wheel_position.js";

const SCRIPT_NAME = "WheelGuides";
const REREAD_DELAYS_MS = [0, 300];
// PinballY's own filter id for Favorite Tables.
const FAVORITES_FILTER = "Favorites";
// How long after "menuclose" the cabinet check reads Favorite Tables again.
const FAVORITES_CHECK_DELAY_MS = 300;

export default function init() {
    if (!isWheelPositionOn(config)) return;
    const host = createPinballYHost();
    const wheelPlaces = getWheelPlaces();
    const position = createWheelPosition(host);
    let gameRunning = false;

    function showTable(game) {
        const place = game && !gameRunning ? wheelPlaces.placeOf(game) : 0;
        if (place === 0) position.hide();
        else position.show(place, wheelPlaces.getTables().length);
    }
    const showCurrent = () => showTable(host.getCurrentTable());
    const readAgain = () => {
        wheelPlaces.markChanged();
        showCurrent();
    };
    const readAgainSoon = () => {
        for (const delay of REREAD_DELAYS_MS) host.setTimeout(safeHandler(SCRIPT_NAME, readAgain), delay);
    };

    // Cabinet check: whether PinballY refreshes Favorite Tables once the
    // player takes the selected table out of them there. The table and
    // the count are taken when the menu opens, before the removal.
    let favoritesAtMenuOpen = null;
    function noteFavoritesAtMenuOpen() {
        const selected = host.getCurrentTable();
        favoritesAtMenuOpen = host.getCurrentFilterId() === FAVORITES_FILTER && selected && selected.isFavorite === true
            ? { selected, count: host.getWheelCount() }
            : null;
    }
    function checkFavoritesRefresh() {
        const before = favoritesAtMenuOpen;
        favoritesAtMenuOpen = null;
        if (!before || before.selected.isFavorite === true) return;
        const countAtClose = host.getWheelCount();
        host.setTimeout(safeHandler(SCRIPT_NAME, () => {
            const countLater = host.getWheelCount();
            logInfo(SCRIPT_NAME, `"${before.selected.title}" taken out of Favorite Tables while shown there: ${before.count} tables at "menuopen", `
                + `${countAtClose} at "menuclose", ${countLater} ${FAVORITES_CHECK_DELAY_MS} ms later `
                + `(${countLater < before.count ? "refreshed" : "not refreshed"}).`, host);
        }), FAVORITES_CHECK_DELAY_MS);
    }

    // Fires on the player's moves and PinballY's own attract switches; the
    // Attract Order's moves fire none and come through onMove.
    host.onGameListEvent("gameselect", safeHandler(SCRIPT_NAME, ev => showTable(ev.game)));
    getAttractOrder().onMove(safeHandler(SCRIPT_NAME, showTable));
    host.onGameListEvent("filterselect", safeHandler(SCRIPT_NAME, readAgainSoon));
    host.on("menuopen", safeHandler(SCRIPT_NAME, noteFavoritesAtMenuOpen));
    // A table added to or taken out of Favorite Tables, or hidden, from the menu.
    host.on("menuclose", safeHandler(SCRIPT_NAME, () => {
        checkFavoritesRefresh();
        readAgainSoon();
    }));
    // The toggle fires neither "filterselect" nor "menuclose"; the shared
    // reading already knows the order changed.
    getWheelOrder().onChange(safeHandler(SCRIPT_NAME, showCurrent));
    // At once, then again: a switch can re-run a Profile's filter, which then shows other tables.
    getProfileStore().onSwitch(safeHandler(SCRIPT_NAME, () => {
        readAgain();
        readAgainSoon();
    }));
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        gameRunning = true;
        position.hide();
    }));
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        gameRunning = false;
        readAgain();
    }));

    showCurrent();
}
