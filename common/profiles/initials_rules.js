// ============================================================
// The rules of a Profile's Initials, shared by Name Entry and the Profile
// store: three capital letters A-Z, unique on the cabinet ignoring letter case,
// and the board places that bear them, for the High Score store.
// Pure: no text, no file, no event; the caller says who holds what.
// - Empty is no refusal here: Name Entry's OK then clears the Initials.
// ============================================================

// Why Initials cannot be given; Name Entry's texts are keyed by these values.
export const INITIALS_REFUSAL = Object.freeze({
    THREE_LETTERS: "threeLetters",
    TAKEN: "taken",
});

export const INITIALS_LENGTH = 3;
export const areValidInitials = initials => typeof initials === "string" && initials.length === INITIALS_LENGTH && /^[A-Z]+$/.test(initials);
export const sameInitials = (a, b) => a.toUpperCase() === b.toUpperCase();
// Whether a board place's initials, as the ROM wrote them (padded, any case), are these Initials.
export const boardBears = (boardInitials, initials) => typeof boardInitials === "string" && sameInitials(boardInitials.trim(), initials);

// holderOf(initials): the other Profile holding them, null when none.
export function initialsRefusal(initials, holderOf) {
    if (initials === "") return null;
    if (!areValidInitials(initials)) return INITIALS_REFUSAL.THREE_LETTERS;
    return holderOf(initials) === null ? null : INITIALS_REFUSAL.TAKEN;
}
