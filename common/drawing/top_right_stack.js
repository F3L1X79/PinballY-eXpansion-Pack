// ============================================================
// Top right stack: where the Rating Plate, the Challenge Card and the Mastery
// Bar sit on the wheel screen, in that order, their panels 24 px apart, under
// the Profile badge or from the window's top. A piece whose Add-on is off
// leaves no room; asked on each show, as the card comes and goes with the week.
// - The plate's room is kept while it hides (no selected table): nothing under it jumps.
// ============================================================

import config from "../core/config.js";
import { getChallenges } from "../challenges/challenge.js";
import { BADGE_HEIGHT, CHALLENGE_CARD_MARGINS, challengeCardCanvasHeight } from "../challenges/challenge_card.js";
import { RATING_PLATE_HEIGHT, RATING_PLATE_MARGINS } from "../profiles/rating_plate.js";
import { MASTERY_BAR_MARGINS } from "../mastery/mastery_bar.js";

// Between one panel's bottom and the next one's top, in reference px.
export const TOP_RIGHT_STACK_GAP = 24;

// Each top: how far below the window's top that piece's canvas sits, in reference px.
export function createTopRightStack(host) {
    const start = config.addOns.profilePicker !== false ? BADGE_HEIGHT : 0;
    const challenges = config.addOns.challenges !== false ? getChallenges() : null;
    const plate = config.addOns.profileRatings !== false
        ? { top: start, height: RATING_PLATE_HEIGHT, margins: RATING_PLATE_MARGINS }
        : null;

    // Where the next piece's canvas starts, its panel GAP under the one above, if any.
    const topUnder = (above, nextMargins) => (above
        ? above.top + above.height - above.margins.bottom + TOP_RIGHT_STACK_GAP - nextMargins.top
        : start);

    const cardTop = () => topUnder(plate, CHALLENGE_CARD_MARGINS);
    function barTop() {
        const view = challenges && challenges.getActiveView();
        const card = view && { top: cardTop(), height: challengeCardCanvasHeight(host, view.challenge), margins: CHALLENGE_CARD_MARGINS };
        return topUnder(card || plate, MASTERY_BAR_MARGINS);
    }

    return { plateTop: () => start, cardTop, barTop };
}
