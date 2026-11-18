// ============================================================
// Profile Ratings: each Profile keeps its own Ratings and Favorite Tables
// (see common/profiles/profile_ratings.js and docs/adr/0024), and the Rating
// Plate shows the active Profile's Rating of the selected table (empty stars
// unrated), a Wheel Mark (common/core/wheel_marks.js), also redrawn when
// "rate game" closes.
// - The Wheel Mark module tells the plate of a Profile switch after start()'s listener has put the next Profile's Ratings on PinballY.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileRatings, ratingOf, onRatingDialogClosed } from "../common/profiles/profile_ratings.js";
import { createRatingPlate, RATING_PLATE_PIECE } from "../common/profiles/rating_plate.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { getWheelMarks } from "../common/core/wheel_marks.js";
import { safeHandler } from "../common/core/safe_handler.js";

const SCRIPT_NAME = "ProfileRatings";

export default function init() {
    const host = createPinballYHost();
    getProfileRatings().start();

    // Asked on each show, never before the registration below.
    const plate = createRatingPlate(host, getDrawingAhead(), { topOf: () => mark.top() });
    const mark = getWheelMarks().register(SCRIPT_NAME, {
        topRight: RATING_PLATE_PIECE,
        show: game => plate.show(ratingOf(game)),
        hide: () => plate.hide(),
    });
    onRatingDialogClosed(host, safeHandler(SCRIPT_NAME, mark.refresh));
}
