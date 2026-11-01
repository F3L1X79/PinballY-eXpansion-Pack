// ============================================================
// Startup summary: called once by main.js, it writes one log line describing
// the setup, Pack Version first, so a pasted logfile.log tells it at a glance.
// A WARNING line follows when PinballY is older than the minimum or newer
// than the last version tested. Log only, nothing on screen.
// - version.status is not the release status: compare semantic (pinbally-help.md 2.10).
// - PinballY loads the game list before main.js: the table count is final.
// ============================================================

import { PACK_VERSION } from "./pack_version.js";
import { isGitCheckout } from "../updates/update_check.js";

const LOG_PREFIX = "[ExpansionPack]";
// The README's minimum, and the last version the pack was tested with.
const MINIMUM_VERSION = { semantic: "1.1.0-beta.10", name: "1.1.0 Beta 10" };
const LAST_TESTED_VERSION = { semantic: "1.1.0-beta.10", name: "1.1.0 Beta 10" };
// Release statuses in semantic strings, from oldest to newest. A dev build
// comes from the code after the last pre-release of its version.
const STATUS_ORDER = ["alpha", "beta", "rc", "Dev", ""];
// "1.1.0-beta.10+10086.20240924T1200", "1.2.0+10100.20250101T0000", "1.1.0-Dev.10090+20240901T1900".
const SEMANTIC_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([A-Za-z]+)(?:\.(\d+))?)?(?:\+|$)/;

// [major, minor, maintenance, status rank, pre-release number], or null for
// a string in another format. A dev build's number is its build, not a rank.
function versionKeyOf(semantic) {
    const match = SEMANTIC_PATTERN.exec(String(semantic));
    if (!match) return null;
    const statusRank = STATUS_ORDER.indexOf(match[4] || "");
    if (statusRank < 0) return null;
    const preRelease = match[4] === "Dev" ? 0 : Number(match[5] || 0);
    return [Number(match[1]), Number(match[2]), Number(match[3]), statusRank, preRelease];
}

const MINIMUM_VERSION_KEY = versionKeyOf(MINIMUM_VERSION.semantic);
const LAST_TESTED_VERSION_KEY = versionKeyOf(LAST_TESTED_VERSION.semantic);

function compareKeys(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return 0;
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

    const key = versionKeyOf(version.semantic);
    if (key === null) return;
    if (compareKeys(key, MINIMUM_VERSION_KEY) < 0) {
        host.log(`${LOG_PREFIX} WARNING: PinballY ${version.display} is older than ${MINIMUM_VERSION.name}, `
            + "the minimum this pack needs.");
    } else if (compareKeys(key, LAST_TESTED_VERSION_KEY) > 0) {
        host.log(`${LOG_PREFIX} WARNING: PinballY ${version.display} is newer than ${LAST_TESTED_VERSION.name}, `
            + "the last version this pack was tested with.");
    }
}
