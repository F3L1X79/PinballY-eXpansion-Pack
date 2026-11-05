// ============================================================
// The PinballY Version gap: for a given version, none, not tested (newer than
// the Tested PinballY Version, or unreadable) or too old, with the versions to
// name in PinballY's own display form. No effect of its own.
// - version.status is not the release status: compare semantic (pinbally-help.md 2.10).
// - The build number is never compared, so a build from upstream master, which still announces Beta 10, has no gap.
// ============================================================

// The README's minimum, and the Tested PinballY Version of this Pack Version.
const MINIMUM_PINBALLY_VERSION = { semantic: "1.1.0-beta.10", display: "1.1.0 (Beta 10)" };
const TESTED_PINBALLY_VERSION = { semantic: "1.1.0-beta.10", display: "1.1.0 (Beta 10)" };
const THIS_PACK = { minimum: MINIMUM_PINBALLY_VERSION, tested: TESTED_PINBALLY_VERSION };
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

function compareKeys(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return 0;
}

// version: systemInfo.version. references: the pack's own versions, unless a test compares with others.
export function pinballYVersionGap(version, { minimum, tested } = THIS_PACK) {
    const running = version.display;
    const key = versionKeyOf(version.semantic);
    if (key === null) return { kind: "notTested", readable: false, running, tested: tested.display };
    if (compareKeys(key, versionKeyOf(minimum.semantic)) < 0) return { kind: "tooOld", running, minimum: minimum.display };
    if (compareKeys(key, versionKeyOf(tested.semantic)) > 0) {
        return { kind: "notTested", readable: true, running, tested: tested.display };
    }
    return { kind: "none" };
}
