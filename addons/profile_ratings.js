// ============================================================
// Profile Ratings: each Profile keeps its own Ratings and Favorite Tables
// (see common/profiles/profile_ratings.js and docs/adr/0024), and the Rating
// Plate shows the active Profile's Rating of the selected table. The plate
// follows "gameselect", the Attract Order's moves, "rate game" closing and
// Change Player, hides on "gamestarted", comes back on "wheelmode".
// - Starts after Challenges and Table Mastery: the plate's place is under their card and bar.
// - The plate's Change Player listener comes after start()'s, which puts the next Profile's Ratings on PinballY.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getProfileRatings, ratingOf, onRatingDialogClosed } from "../common/profiles/profile_ratings.js";
import { createRatingPlate } from "../common/profiles/rating_plate.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { getChallenges } from "../common/challenges/challenge.js";
import { challengeCardBottom } from "../common/challenges/challenge_card.js";
import { MASTERY_BAR_HEIGHT } from "../common/mastery/mastery_bar.js";
import { getAttractOrder } from "../common/tables/attract_order.js";
import { safeHandler } from "../common/core/safe_handler.js";
import config from "../common/core/config.js";

const SCRIPT_NAME = "ProfileRatings";

export default function init() {
    const host = createPinballYHost();
    const store = getProfileStore();
    getProfileRatings().start();

    const underBadge = config.addOns.profilePicker !== false;
    const challenges = config.addOns.challenges !== false ? getChallenges() : null;
    // The Mastery Bar shows for every selected table while Table Mastery is on.
    const barHeight = config.addOns.tableMastery !== false ? MASTERY_BAR_HEIGHT : 0;
    const plate = createRatingPlate(host, getDrawingAhead(), {
        topOf: () => challengeCardBottom(host, challenges, { underBadge }) + barHeight,
    });
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
