// ============================================================
// Profile Ratings: each Profile keeps its own Ratings and Favorite Tables
// (see common/profiles/profile_ratings.js and docs/adr/0024), and the Rating
// Plate shows the active Profile's Rating of the selected table (empty stars
// unrated), a Wheel Mark (common/core/wheel_marks.js), also redrawn when
// "rate game" closes.
// - The plate's Change Player redraw comes after start()'s listener, which puts the next Profile's Ratings on PinballY.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileRatings, ratingOf, onRatingDialogClosed } from "../common/profiles/profile_ratings.js";
import { createRatingPlate } from "../common/profiles/rating_plate.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { createTopRightStack } from "../common/drawing/top_right_stack.js";
import { getWheelMarks } from "../common/core/wheel_marks.js";
import { safeHandler } from "../common/core/safe_handler.js";

const SCRIPT_NAME = "ProfileRatings";

export default function init() {
    const host = createPinballYHost();
    getProfileRatings().start();

    const plate = createRatingPlate(host, getDrawingAhead(), { topOf: createTopRightStack(host).plateTop });
    const mark = getWheelMarks().register(SCRIPT_NAME, {
        show: game => plate.show(ratingOf(game)),
        hide: () => plate.hide(),
    });
    onRatingDialogClosed(host, safeHandler(SCRIPT_NAME, mark.refresh));
}
