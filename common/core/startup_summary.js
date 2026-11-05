// ============================================================
// Startup summary: called once by main.js, it writes one log line describing
// the setup, Pack Version first, so a pasted logfile.log tells it at a glance.
// A WARNING line follows when the PinballY Version has a gap (see
// pinbally_version.js). Log only, nothing on screen.
// - PinballY loads the game list before main.js: the table count is final.
// ============================================================

import { PACK_VERSION } from "./pack_version.js";
import { pinballYVersionGap } from "./pinbally_version.js";
import { isGitCheckout } from "../updates/update_check.js";

const LOG_PREFIX = "[ExpansionPack]";

function gapWarning(gap) {
    if (gap.kind === "tooOld") return `PinballY ${gap.running} is older than ${gap.minimum}, the minimum this pack needs.`;
    if (gap.kind !== "notTested") return null;
    return gap.readable
        ? `PinballY ${gap.running} is newer than ${gap.tested}, the last version this pack was tested with.`
        : `PinballY ${gap.running} has a version this pack cannot read: it was not tested with this pack.`;
}

// profileCount: null when the Profile store could not load.
export function writeStartupSummary(host, { language, addOns, profileCount }) {
    const version = host.getPinballYVersion();
    const offAddOns = Object.keys(addOns).filter(key => addOns[key] === false);
    const profiles = profileCount === null ? "Profiles unknown" : `${profileCount} Profiles`;
    const pack = `eXpansion Pack v${PACK_VERSION}${isGitCheckout(host) ? " (git checkout)" : ""}`;
    host.log(`${LOG_PREFIX} Started: ${pack}, PinballY ${version.display}, build ${version.build}, language ${language}, `
        + `Add-ons off: ${offAddOns.length === 0 ? "none" : offAddOns.join(", ")}, `
        + `${profiles}, ${host.getVisibleTables().length} tables`);

    const warning = gapWarning(pinballYVersionGap(version));
    if (warning !== null) host.log(`${LOG_PREFIX} WARNING: ${warning}`);
}
