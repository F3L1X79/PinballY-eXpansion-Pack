// ============================================================
// The Backglass Clock Position in use: the configuration's until the
// eXpansion Pack Settings save a choice, which then applies at the next game
// without a restart.
// ============================================================

import config from "../core/config.js";

let savedChoice = null;

export const backglassClockPositionInUse = () => savedChoice ?? config.backglassClockPosition;

export function setBackglassClockPositionInUse(position) {
    savedChoice = position;
}
