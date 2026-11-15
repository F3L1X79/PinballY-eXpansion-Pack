// ============================================================
// Profile Ratings: each Profile keeps its own Ratings and Favorite Tables
// (see common/profiles/profile_ratings.js and docs/adr/0024), and the Rating
// Plate shows the active Profile's Rating of the selected table (empty stars
// unrated), following "gameselect", the Attract Order, "rate game" closing and
// Change Player; hidden from "gamestarted" to "wheelmode".
// - The plate's Change Player listener comes after start()'s, which puts the next Profile's Ratings on PinballY.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getProfileRatings, ratingOf, onRatingDialogClosed } from "../common/profiles/profile_ratings.js";
import { createRatingPlate } from "../common/profiles/rating_plate.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { createTopRightStack } from "../common/drawing/top_right_stack.js";
import { getAttractOrder } from "../common/tables/attract_order.js";
import { safeHandler } from "../common/core/safe_handler.js";

const SCRIPT_NAME = "ProfileRatings";

export default function init() {
    const host = createPinballYHost();
    const store = getProfileStore();
    getProfileRatings().start();

    const plate = createRatingPlate(host, getDrawingAhead(), { topOf: createTopRightStack(host).plateTop });
    let gameRunning = false;

    function showTable(game) {
        if (gameRunning || !game) plate.hide();
        else plate.show(ratingOf(game));
    }
    const showCurrent = () => showTable(host.getCurrentTable());

    // Fires on the player's moves and PinballY's own attract switches; the
    // Attract Order's moves fire none and come through onMove.
    host.onGameListEvent("gameselect", safeHandler(SCRIPT_NAME, ev => showTable(ev.game)));
    getAttractOrder().onMove(safeHandler(SCRIPT_NAME, showTable));
    onRatingDialogClosed(host, safeHandler(SCRIPT_NAME, showCurrent));
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        gameRunning = true;
        plate.hide();
    }));
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        gameRunning = false;
        showCurrent();
    }));
    store.onSwitch(safeHandler(SCRIPT_NAME, showCurrent));

    showCurrent();
}
