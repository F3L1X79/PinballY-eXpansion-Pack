// ============================================================
// The rules of a new Profile's name, shared by Name Entry and the Profile
// store: why a name cannot be used, ignoring letter case, or null.
// Pure: no text, no file, no event; the caller passes what is listed.
// - A name differing by an accent is another name, and a folder set aside is not listed.
// ============================================================

// Why a name cannot be used; Name Entry's texts are keyed by these values, and
// an empty name needs no explanation.
export const NAME_REFUSAL = Object.freeze({
    EMPTY: "empty",
    GUEST: "guest",
    RESERVED: "reserved",
    TAKEN: "taken",
});

// Also the folder name; any letter case is Guest.
export const GUEST_NAME = "guest";
export const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
// Windows cannot create a folder of these names. The others it reserves hold digits, which the ring lacks.
const RESERVED_NAMES = ["con", "prn", "aux", "nul"];

export const withoutTrailingHyphen = name => name.replace(/-+$/, "");

// listedNames: the listed Profiles' names; guestNameShown: Guest's name in the current language.
export function nameRefusal(name, { listedNames, guestNameShown }) {
    const cleaned = withoutTrailingHyphen(name);
    if (cleaned === "") return NAME_REFUSAL.EMPTY;
    if (sameName(cleaned, GUEST_NAME) || sameName(cleaned, guestNameShown)) return NAME_REFUSAL.GUEST;
    if (RESERVED_NAMES.includes(cleaned.toLowerCase())) return NAME_REFUSAL.RESERVED;
    if (listedNames.some(listed => sameName(listed, cleaned))) return NAME_REFUSAL.TAKEN;
    return null;
}
