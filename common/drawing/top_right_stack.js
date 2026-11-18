// ============================================================
// Top right stack: where the Rating Plate, the Challenge Card and the Mastery
// Bar sit on the wheel screen, in that order, their panels 24 px apart, from
// right under the Profile badge or the window's top. Each piece gives its own
// sizes; one not added (its Add-on off) leaves no room. Asked on each show.
// - With the badge and the card, the plate rises beside the badge: no gap under the badge.
// - The plate's room is kept while it hides (no selected table): nothing under it jumps.
// ============================================================

// The pieces, top to bottom.
export const TOP_RIGHT_STACK = Object.freeze({
    RATING_PLATE: "ratingPlate",
    CHALLENGE_CARD: "challengeCard",
    MASTERY_BAR: "masteryBar",
});
const ORDER = [TOP_RIGHT_STACK.RATING_PLATE, TOP_RIGHT_STACK.CHALLENGE_CARD, TOP_RIGHT_STACK.MASTERY_BAR];

// Between one panel's bottom and the next one's top, in reference px.
export const TOP_RIGHT_STACK_GAP = 24;
// The Profile badge's canvas height, on the cabinet's 1920 px high playfield.
export const BADGE_HEIGHT = 170;

// underBadge: the Profile badge sits above the stack.
export function createTopRightStack({ underBadge }) {
    const start = underBadge ? BADGE_HEIGHT : 0;
    // By place: { margins: { top, bottom }, height() }, the canvas height in
    // reference px, or null while the piece takes no room (a card with no
    // Challenge); the last piece, with nothing under it, needs no height().
    const pieces = new Map();

    const plateBesideBadge = () => underBadge && pieces.has(TOP_RIGHT_STACK.RATING_PLATE) && pieces.has(TOP_RIGHT_STACK.CHALLENGE_CARD);

    // How far below the window's top that piece's canvas sits, in reference px.
    function topOf(place) {
        if (place === TOP_RIGHT_STACK.RATING_PLATE && plateBesideBadge()) {
            // Its panel GAP above the card's, so the card stays right under
            // the badge (validated on the cabinet).
            const plate = pieces.get(TOP_RIGHT_STACK.RATING_PLATE);
            const card = pieces.get(TOP_RIGHT_STACK.CHALLENGE_CARD);
            return start + card.margins.top - TOP_RIGHT_STACK_GAP - (plate.height() - plate.margins.bottom);
        }
        let above = null;
        for (const pieceAbove of ORDER) {
            const piece = pieces.get(pieceAbove);
            if (!piece || (pieceAbove === TOP_RIGHT_STACK.RATING_PLATE && plateBesideBadge())) continue;
            const top = above ? above.top + above.height - above.margins.bottom + TOP_RIGHT_STACK_GAP - piece.margins.top : start;
            if (pieceAbove === place) return top;
            const height = piece.height ? piece.height() : null;
            if (height !== null) above = { top, height, margins: piece.margins };
        }
        return start;
    }

    return {
        add(place, piece) { pieces.set(place, piece); },
        topOf,
    };
}
