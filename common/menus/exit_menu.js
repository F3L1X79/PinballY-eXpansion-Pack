// ============================================================
// The Exit menu's player group: the pack's Profile entries, in their own
// section right after Shut Down (after Quit when PinballY leaves it out).
// Called from "menuopen" listeners; edits ev.items.
// - Each entry keeps its rank in the group, whatever order the Add-ons run.
// ============================================================

import { SEPARATOR_CMD } from "./menu_separator.js";

export const PLAYER_GROUP_RANK = {
    CHANGE_PLAYER: 0,
    MANAGE_PROFILES: 1,
};

// Command id -> rank, for every entry ever added: ids don't change during
// a session, and the group is found again in each fresh item list.
const ranks = new Map();

export function addToPlayerGroup(ev, host, entry, rank) {
    ranks.set(entry.cmd, rank);
    const items = [...ev.items];
    const groupIndexes = [];
    items.forEach((item, index) => { if (ranks.has(item.cmd)) groupIndexes.push(index); });
    if (groupIndexes.length > 0) {
        const nextIndex = groupIndexes.find(index => ranks.get(items[index].cmd) > rank);
        items.splice(nextIndex ?? groupIndexes[groupIndexes.length - 1] + 1, 0, entry);
    } else {
        const anchor = ["PowerOff", "Quit"]
            .map(name => items.findIndex(item => item.cmd === host.getBuiltInCommand(name)))
            .find(index => index !== -1);
        items.splice(anchor === undefined ? 0 : anchor + 1, 0, { cmd: SEPARATOR_CMD }, entry);
    }
    ev.items = items;
    ev.menuUpdated = true;
}
