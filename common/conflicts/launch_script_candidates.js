// ============================================================
// The known External Add-ons that take the launch screen, found by file name in
// PinballY's Scripts folder and its sub-folders (docs/research/script-conflicts.md).
// They only name candidates in the Conflict Notice: a file found never raises one.
// - The pack's own folder is skipped: its seamless_launch_overlay.js is the pack's.
// - Throws when a folder cannot be read; the caller logs it.
// ============================================================

// In the order the Notice names them.
const KNOWN_LAUNCH_SCRIPTS = Object.freeze([
    "LaunchVideo.js",
    "LaunchFade.js",
    "launchAnimations.js",
    "FlexDMD.js",
    "seamless_launch_overlay.js",
]);

// The known names found, each once; host: getProgramFolder, getProjectFolder and files.
export function findLaunchScriptCandidates(host) {
    const packFolder = host.getProjectFolder().toLowerCase();
    const found = new Set();
    const visit = (folder) => {
        for (const name of host.files.listFiles(folder)) found.add(name.toLowerCase());
        for (const name of host.files.listFolders(folder)) {
            const subFolder = `${folder}\\${name}`;
            if (subFolder.toLowerCase() !== packFolder) visit(subFolder);
        }
    };
    visit(`${host.getProgramFolder().replace(/\\+$/, "")}\\Scripts`);
    return KNOWN_LAUNCH_SCRIPTS.filter(name => found.has(name.toLowerCase()));
}
