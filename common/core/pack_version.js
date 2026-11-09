// ============================================================
// Pack Version: the one place the eXpansion Pack's version is written, read
// by the Update Check and by maintainer/release/publish_release.mjs. Raised
// before tagging each release vX.Y.Z (see docs/adr/0018).
// - Releases are plain X.Y.Z: a pre-release or another format is never newer.
// ============================================================

export const PACK_VERSION = "1.4.1";

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/;

// [major, minor, patch], or null for a string in another format.
function versionKeyOf(version) {
    const match = VERSION_PATTERN.exec(typeof version === "string" ? version : "");
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

// The Pack Version a release tag ("v0.2.0") names: "0.2.0".
export const packVersionOfTag = tag => tag.replace(/^v/, "");

// True when candidate ("v0.2.0" or "0.2.0") is a later version than
// reference, the running Pack Version by default.
export function isNewerPackVersion(candidate, reference = PACK_VERSION) {
    const candidateKey = versionKeyOf(candidate);
    const referenceKey = versionKeyOf(reference);
    if (!candidateKey || !referenceKey) return false;
    for (let i = 0; i < candidateKey.length; i++) {
        if (candidateKey[i] !== referenceKey[i]) return candidateKey[i] > referenceKey[i];
    }
    return false;
}
