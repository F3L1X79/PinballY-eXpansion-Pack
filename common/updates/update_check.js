// ============================================================
// Update Check: at each start, unless it is off or the pack folder is a git
// checkout, one background GET of the latest GitHub release. A newer Pack
// Version with its zip and SHA-256 digest is remembered in the update state,
// an equal or older one forgets it; only the Status Icons show it, from this
// start, through onUpdateCheckDone (docs/adr/0018).
// - Started by main.js whatever config.addOns says: never an Add-on.
// - A failure (offline, 403/429, a bad reply) is one log line, not an error.
// ============================================================

import config from "../core/config.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { safeHandler } from "../core/safe_handler.js";
import { PACK_VERSION, isNewerPackVersion, packVersionOfTag } from "../core/pack_version.js";
import { getUpdateState } from "./update_state.js";

const SCRIPT_NAME = "UpdateCheck";
export const LATEST_RELEASE_URL = "https://api.github.com/repos/F3L1X79/PinballY-Expansion-Pack/releases/latest";
const ZIP_ASSET_NAME = "ExpansionPack.zip";
// GitHub fills each asset's digest; the release script uploads nothing else.
const DIGEST_PATTERN = /^sha256:([0-9a-f]{64})$/i;
// GitHub's API refuses a request without one.
const USER_AGENT = `PinballY-Expansion-Pack/${PACK_VERSION}`;

// Thrown for a reply the check cannot use: logged as one line, not an error.
class BadReply extends Error {}

function parseReply(text) {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new BadReply(`the reply is not JSON (${error.message})`);
    }
}

// The newer release's zip as { zipUrl, sha256 }.
function zipAssetOf(reply) {
    const asset = (Array.isArray(reply.assets) ? reply.assets : []).find(candidate => candidate && candidate.name === ZIP_ASSET_NAME);
    if (!asset) throw new BadReply(`no ${ZIP_ASSET_NAME} in ${reply.tag_name}`);
    if (typeof asset.browser_download_url !== "string" || asset.browser_download_url === "") {
        throw new BadReply(`no download URL for ${ZIP_ASSET_NAME} in ${reply.tag_name}`);
    }
    const digest = DIGEST_PATTERN.exec(typeof asset.digest === "string" ? asset.digest : "");
    if (!digest) throw new BadReply(`no SHA-256 digest for ${ZIP_ASSET_NAME} in ${reply.tag_name}`);
    return { zipUrl: asset.browser_download_url, sha256: digest[1].toLowerCase() };
}

// A .git file instead of a folder marks a git worktree.
export function isGitCheckout(host) {
    const gitPath = `${host.getProjectFolder()}\\.git`;
    return host.files.folderExists(gitPath) || host.files.fileExists(gitPath);
}

// The remembered release a Pack Update could install now, or null: a newer
// Pack Version, outside a git checkout.
export function installableRelease(host, state) {
    const release = state.latestRelease();
    if (!release || !isNewerPackVersion(release.packVersion, PACK_VERSION) || isGitCheckout(host)) return null;
    return release;
}

// Resolves once the reply is handled, never rejects; stays pending while
// GitHub doesn't answer.
export function runUpdateCheck(host, state, { enabled }) {
    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);
    if (!enabled) {
        log("Off: no request.");
        return Promise.resolve();
    }
    if (isGitCheckout(host)) {
        log("Git checkout: no request, git pull updates the pack.");
        return Promise.resolve();
    }

    const handleReply = (text) => {
        let reply;
        try {
            reply = parseReply(text);
            if (!reply || typeof reply.tag_name !== "string") throw new BadReply("the reply has no tag_name");
            if (!isNewerPackVersion(reply.tag_name)) {
                state.forgetRelease();
                log(`Latest release ${reply.tag_name}, nothing newer than ${PACK_VERSION}.`);
                return;
            }
            const release = { packVersion: packVersionOfTag(reply.tag_name), ...zipAssetOf(reply) };
            state.rememberRelease(release);
            log(`Pack Version ${release.packVersion} found, remembered for the next start.`);
        } catch (error) {
            if (!(error instanceof BadReply)) throw error;
            log(`No update: ${error.message}.`);
        }
    };

    // The cache-busting query keeps MSXML from answering with an earlier reply.
    const url = `${LATEST_RELEASE_URL}?t=${host.now().getTime()}`;
    // Inside a Promise, so a request MSXML refuses to open fails like an
    // offline one: one line, not an error.
    const reply = new Promise(resolve => resolve(host.httpGet(url, { "User-Agent": USER_AGENT, Accept: "application/vnd.github+json" })));
    return reply.then(
        safeHandler(SCRIPT_NAME, handleReply),
        safeHandler(SCRIPT_NAME, error => log(`No answer from GitHub: ${error.message || "no reason given"}.`)));
}

// Whether this start runs without the check, the setting being off; a git
// checkout is never checked anyway.
export const isUpdateCheckOff = host => !config.updateCheck && !isGitCheckout(host);

const checkDoneListeners = [];

// listener() runs once this start's reply or failure is handled, so the
// Status Icons show what it remembered or forgot right away; never while
// the request stays unanswered.
export function onUpdateCheckDone(listener) {
    checkDoneListeners.push(listener);
}

export function startUpdateCheck() {
    runUpdateCheck(createPinballYHost(), getUpdateState(), { enabled: config.updateCheck })
        .then(safeHandler(SCRIPT_NAME, () => { for (const listener of checkDoneListeners) listener(); }));
}
