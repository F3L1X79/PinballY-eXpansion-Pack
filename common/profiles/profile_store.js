// ============================================================
// Profile store: the only module that knows the Profiles folder (one sub-folder
// per Profile: Avatar, profile.json, Play Log; cabinet.json for the household).
// Decides which game is a Play (ADR 0007) and tells its listeners of each switch, update,
// removal, Avatar given and Play (onPlay, ADR 0008), and of a Play it could not save or log.
// Handles the Profile Reset, the Profile Removal and the History Import (ADR 0025). Listens to "gamestarted" / "gameover".
// - Every write is whole: tmp, backup, rename; a broken or newer file comes back from its backup, the recovery written to the Error Log.
// - isAdmin and isChild: by hand or setMark, which writes true or removes the key (ADR 0020); a first Profile created gets isAdmin (ADR 0023).
// - Other modules' files sit next to cabinet.json or in a Profile's folder; no Profile Reset touches them.
// - Another Profile's profile.json is read afresh on each call, but once per withCachedReads run.
// - At startup, Guest's old shipped avatar.png (by size) goes only next to avatar.jpg and without avatar.jpg.bak.
// ============================================================

import { safeHandler, logHandlerError } from "../core/safe_handler.js";
import { logError } from "../core/error_log.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { isUntrackedTable } from "../core/untracked_tables.js";
import { markRefusal } from "./setup_entries.js";
import { areValidInitials, sameInitials } from "./initials_rules.js";
import { GUEST_NAME, nameRefusal, sameName, withoutTrailingHyphen } from "./profile_name_rules.js";

const SCRIPT_NAME = "ProfileStore";

// Bumped only for a breaking format change (ADR 0016), never for an added
// field: a missing one is read as empty. A newer file is set aside.
const PROFILE_VERSION = 1;
const CABINET_VERSION = 1;
const PLAY_LOG_VERSION = 1;
// Still images only: PinballY keeps an animated image locked while it shows it.
// avatar.jpg first, so that an image the owner drops wins over the avatar.png Avatar Choice copies.
const AVATAR_FILES = ["avatar.jpg", "avatar.png"];
// The Own Picture: the photo the owner drops, as avatar.jpg or as an avatar.png that is
// no copy of a pack portrait; set aside as its ".bak" while a portrait is worn.
const OWN_PICTURE_FILE = "avatar.jpg";
const SET_ASIDE_OWN_PICTURE_FILE = "avatar.jpg.bak";
const PORTRAIT_COPY_FILE = "avatar.png";
const OWN_PICTURE_PLACES = [OWN_PICTURE_FILE, PORTRAIT_COPY_FILE].map(inUse => ({ inUse, setAside: `${inUse}.bak`, older: `${inUse}.older.bak` }));
const PACK_PORTRAIT_FILE = /^avatar_choice_\d+\.png$/i;
// Guest's avatar.png shipped up to v1.7.3, known by its size: the same picture as the avatar.jpg shipped since.
const OLD_GUEST_AVATAR_SIZE = 1210489;

const isGuestName = name => sameName(name, GUEST_NAME);
// A player parks or hides a Profile by renaming its folder.
const isIgnoredFolder = name => name.startsWith(".") || name.startsWith("_");
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const pad = number => String(number).padStart(2, "0");
// By its methods rather than instanceof: a Date may come from another realm's Date.
const isValidDate = value => Boolean(value) && typeof value.getTime === "function" && !isNaN(value.getTime());

// Local time, readable in the file: "2026-09-24T21:10:00".
export function toLocalIsoString(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
        + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// For a file name, where ":" is not allowed: "2026-09-24_21-10-00".
const toFileDate = date => toLocalIsoString(date).replace("T", "_").replace(/:/g, "-");

// The session stats: shortestSeconds stays 0 until a first Play.
const emptySessions = () => ({
    longestSeconds: 0,
    shortestSeconds: 0,
    rageQuit: false,
    grandReturn: false,
    dayManufacturers: { day: "", list: [] },
    mostManufacturersInADay: 0,
});
const emptyProfileData = () => ({
    version: PROFILE_VERSION, plays: {}, streaks: {}, randomGames: 0, sessions: emptySessions(), notified: [],
});
// Set by hand or from Manage profiles (ADR 0020): kept through a Profile Reset.
const MARK_NAMES = ["isAdmin", "isChild"];
// The History Import's record is kept too, for the import never to be offered again (ADR 0025).
const HISTORY_IMPORT_KEY = "historyImport";
// The Profile's identity on tables' boards, like its name (ADR 0026).
const INITIALS_KEY = "initials";
const KEPT_THROUGH_RESET = [...MARK_NAMES, HISTORY_IMPORT_KEY, INITIALS_KEY];
// Set by the History Import or a claim by Initials, until the Profile's next Achievements check
// marks what it reached Notified without a toast; dropped by a Profile Reset.
const UNANNOUNCED_CHECK_KEY = "unannouncedCheckDue";
const NO_PLAY = Object.freeze({ count: 0, seconds: 0, lastPlayed: "" });

// A shorter game is a launch by mistake, not a Play.
export const MIN_PLAY_SECONDS = 60;
const playLogBaseName = year => `play-log-${year}`;
// A Play Log year file or its backup: "play-log-2026.json", "play-log-2026.bak.json".
const PLAY_LOG_FILE = /^(play-log-(\d+))(\.bak)?\.json$/i;

export function createProfileStore(host) {
    const projectFolder = host.getProjectFolder();
    const profilesFolder = `${projectFolder}\\profiles`;
    const defaultAvatarPath = `${projectFolder}\\assets\\images\\default_avatar.png`;
    const packPortraitsFolder = `${projectFolder}\\assets\\images\\avatar_choice`;
    const files = host.files;
    const switchListeners = [];
    const updateListeners = [];
    const playListeners = [];
    const playFailedListeners = [];
    const avatarListeners = [];
    const removeListeners = [];
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    // A file that could not be read, and what was kept aside or restored:
    // in the Error Log too, the file an owner attaches to a report.
    const logRecovery = text => logError(SCRIPT_NAME, text, host);
    // Logged once per session: the picker lists the Profiles on every opening.
    const loggedUnreadableAvatars = new Set();
    // Logged once per session too: the menus check the marks and Initials on every opening.
    const loggedHandEditProblems = new Set();

    // The first readable one of the Profile's own Avatars, otherwise the default Avatar.
    function avatarPathOf(folder) {
        for (const path of AVATAR_FILES.map(name => `${folder}\\${name}`)) {
            if (!files.fileExists(path)) continue;
            if (files.isImageReadable(path)) return path;
            if (!loggedUnreadableAvatars.has(path)) {
                loggedUnreadableAvatars.add(path);
                log(`${path} is not a readable PNG or JPEG image; moving on to the next image or the default Avatar.`);
            }
        }
        return defaultAvatarPath;
    }

    function profileAt(folderName) {
        const folder = `${profilesFolder}\\${folderName}`;
        return { name: folderName, isGuest: isGuestName(folderName), folder, avatarPath: avatarPathOf(folder) };
    }

    // Guest first, then the others alphabetically. Re-read on every call, so a folder added while
    // PinballY runs shows up.
    function listProfileNames() {
        const folderNames = files.listFolders(profilesFolder).filter(name => !isIgnoredFolder(name));
        const others = folderNames.filter(name => !isGuestName(name)).sort((a, b) => a.localeCompare(b));
        return [folderNames.find(isGuestName) || GUEST_NAME, ...others];
    }
    const listProfileRecords = () => listProfileNames().map(profileAt);

    // Only the found Profile's Avatar is checked: each check draws a probe layer.
    function findProfile(name) {
        const folderName = folderNameOf(name);
        return folderName === undefined ? null : profileAt(folderName);
    }
    // The listed folder of the named Profile, in any case; undefined when none.
    const folderNameOf = name => listProfileNames().find(folder => sameName(folder, name));
    // The same, throwing when none; unlike findProfile, it reads no Avatar.
    function listedFolderOf(name) {
        const folderName = folderNameOf(name);
        if (folderName === undefined) throw new Error(`No Profile named "${name}".`);
        return folderName;
    }
    const listedFolderPathOf = name => `${profilesFolder}\\${listedFolderOf(name)}`;

    // The file's data, or null when it is missing, not JSON or not an object;
    // the cause of an unreadable file is logged here, its outcome by the caller.
    function tryReadJson(path) {
        if (!files.fileExists(path)) return null;
        try {
            const data = JSON.parse(files.readText(path));
            if (isRecord(data)) return data;
            logRecovery(`${path} does not hold a JSON object.`);
        } catch (error) {
            logRecovery(`${path} cannot be read: ${error.message}`);
        }
        return null;
    }

    // "<name>.<label>-<date>.json", numbered when that name is taken.
    function datedFileName(folder, name, label) {
        const baseName = `${name}.${label}-${toFileDate(host.now())}`;
        let datedName = `${baseName}.json`;
        for (let copy = 2; files.fileExists(`${folder}\\${datedName}`); copy++) datedName = `${baseName}-${copy}.json`;
        return datedName;
    }

    // Renames a broken file to "<name>.broken-<date>.json" next to it, for
    // the player to repair, or a newer one to "<name>.newer-<date>.json";
    // returns the new file name.
    function setAside(folder, name, kind = "broken") {
        const asideName = datedFileName(folder, name, kind);
        files.renameFile(`${folder}\\${name}.json`, `${folder}\\${asideName}`);
        return asideName;
    }

    // Saved by a newer pack (ADR 0016): read or rewritten here, it would be
    // misread, so it is set aside like a broken file. Returns the new name,
    // null when the file is not newer or no code version is given.
    function setAsideIfNewer(folder, name, data, codeVersion) {
        if (codeVersion === undefined || !(Number(data.version) > codeVersion)) return null;
        const asideName = setAside(folder, name, "newer");
        logRecovery(`${folder}\\${name}.json has version ${data.version}, newer than this pack's ${codeVersion};`
            + ` kept aside as ${asideName}, never read.`);
        return asideName;
    }

    // The saved data, or null for a file never saved. A missing, broken or
    // newer file comes back from its usable backup; when the backup is
    // broken or newer too, both are set aside and the file starts from zero
    // (null). A set-aside file is never deleted: it may hold a hand edit.
    function loadJson(folder, baseName, label, codeVersion) {
        const path = `${folder}\\${baseName}.json`;
        const backupPath = `${folder}\\${baseName}.bak.json`;
        const data = tryReadJson(path);
        const newerFile = data ? setAsideIfNewer(folder, baseName, data, codeVersion) : null;
        if (data && !newerFile) return data;
        const hasFile = newerFile !== null || files.fileExists(path);
        if (!hasFile && !files.fileExists(backupPath)) return null;

        const asideFile = newerFile || (hasFile ? setAside(folder, baseName) : null);
        const asideKind = newerFile ? "newer" : "broken";
        const backup = tryReadJson(backupPath);
        const newerBackup = backup ? setAsideIfNewer(folder, `${baseName}.bak`, backup, codeVersion) : null;
        if (backup && !newerBackup) {
            saveJson(folder, baseName, backup);
            logRecovery(`${label} is ${newerFile ? "newer" : "missing or unreadable"}; restored from its backup`
                + `${asideFile ? ` (${asideKind} file kept as ${asideFile})` : ""}.`);
            return backup;
        }
        const asideFiles = asideFile ? [asideFile] : [];
        if (newerBackup) asideFiles.push(newerBackup);
        else if (files.fileExists(backupPath)) asideFiles.push(setAside(folder, `${baseName}.bak`));
        const problem = newerFile || newerBackup ? "cannot be read by this pack" : "are unreadable";
        logRecovery(`${label} and its backup ${problem}; kept aside as ${asideFiles.join(" and ")}, starting from zero.`);
        return null;
    }

    // Writes "<name>.tmp.json", renames the current file to "<name>.bak.json"
    // (replacing the older backup), then renames the tmp file into place: a
    // crash at any point leaves a readable file or its backup.
    function saveJson(folder, baseName, data) {
        const path = `${folder}\\${baseName}.json`;
        const tmpPath = `${folder}\\${baseName}.tmp.json`;
        const backupPath = `${folder}\\${baseName}.bak.json`;
        files.createFolder(profilesFolder);
        files.createFolder(folder);
        files.writeText(tmpPath, JSON.stringify(data, null, 2));
        if (files.fileExists(path)) {
            if (files.fileExists(backupPath)) files.deleteFile(backupPath);
            files.renameFile(path, backupPath);
        }
        files.renameFile(tmpPath, path);
    }

    // A file saved before a domain or a session stat existed gets it empty.
    function readProfileData(profile) {
        const saved = loadJson(profile.folder, "profile", `${profile.name}\\profile.json`, PROFILE_VERSION) || {};
        return { ...emptyProfileData(), ...saved, sessions: { ...emptySessions(), ...saved.sessions } };
    }
    const saveProfileData = (profile, data) => saveJson(profile.folder, "profile", data);
    const saveCabinet = () => saveJson(profilesFolder, "cabinet", cabinet);

    // Guest always exists: its folder ships with the add-ons and comes back
    // at startup if a player deleted it.
    files.createFolder(profilesFolder);
    files.createFolder(findProfile(GUEST_NAME).folder);
    dropOldGuestAvatar();

    // A pack update merges the kept profiles folder into the new one, so the
    // shipped avatar.jpg lands next to the old avatar.png, which it hides:
    // that copy goes. Any other avatar.png, or a set-aside avatar.jpg.bak
    // (Guest chose a portrait since), is left alone.
    function dropOldGuestAvatar() {
        try {
            const folder = listedFolderPathOf(GUEST_NAME);
            const oldAvatar = `${folder}\\avatar.png`;
            const info = files.getFileInfo(oldAvatar);
            if (!info || info.size !== OLD_GUEST_AVATAR_SIZE) return;
            if (files.fileExists(`${folder}\\${SET_ASIDE_OWN_PICTURE_FILE}`)) return;
            if (!files.fileExists(`${folder}\\${OWN_PICTURE_FILE}`)) {
                log(`Guest's shipped ${OWN_PICTURE_FILE} is missing: Guest keeps its old avatar.png as its Own Picture.`);
                return;
            }
            files.deleteFile(oldAvatar);
            log(`Guest's old shipped avatar.png was deleted: its shipped ${OWN_PICTURE_FILE} is the same picture.`);
        } catch (error) {
            logError(SCRIPT_NAME, `ERROR Guest's old shipped avatar.png cannot be dropped (${error.message});`
                + " Guest keeps its current Avatar.", host, error);
        }
    }

    const savedCabinet = loadJson(profilesFolder, "cabinet", "cabinet.json", CABINET_VERSION);
    const cabinet = savedCabinet || { version: CABINET_VERSION, activeProfile: GUEST_NAME };
    let activeProfile = typeof cabinet.activeProfile === "string" ? findProfile(cabinet.activeProfile) : null;
    const activeFolderMissing = !activeProfile;
    if (activeFolderMissing) {
        log(`The active Profile "${cabinet.activeProfile}" has no folder in ${profilesFolder}; Guest is active.`);
        activeProfile = findProfile(GUEST_NAME);
        cabinet.activeProfile = activeProfile.name;
    }
    let activeData = readProfileData(activeProfile);
    if (!savedCabinet || activeFolderMissing) saveCabinet();

    const publicProfile = ({ name, isGuest, avatarPath }) => ({ name, isGuest, avatarPath });

    // The named Profile, the active one without listing the folders.
    function profileNamed(profileName) {
        if (sameName(profileName, activeProfile.name)) return activeProfile;
        const profile = findProfile(profileName);
        if (!profile) throw new Error(`No Profile named "${profileName}".`);
        return profile;
    }

    // Inside withCachedReads: another Profile's data by lower-case name, read
    // once for the whole run; null outside, every call then reading afresh.
    let readCache = null;

    // The named Profile and its data: the active one's from memory, another
    // one's read afresh from its file (once per withCachedReads run).
    function profileWithData(profileName) {
        // Checked here too, so the active Profile's data is never re-read.
        if (sameName(profileName, activeProfile.name)) return { profile: activeProfile, data: activeData };
        const profile = profileNamed(profileName);
        if (!readCache) return { profile, data: readProfileData(profile) };
        const key = profile.name.toLowerCase();
        if (!readCache.has(key)) readCache.set(key, readProfileData(profile));
        return { profile, data: readCache.get(key) };
    }

    // Runs run() with another Profile's profile.json read once, whichever
    // readers ask for it: on the cabinet each read costs a file and a parse,
    // and one Profile's stats asked for it nine times. Nested runs share the
    // outer one's reads; a write forgets what was read of that Profile.
    function withCachedReads(run) {
        if (readCache) return run();
        readCache = new Map();
        try {
            return run();
        } finally {
            readCache = null;
        }
    }

    const forgetCachedRead = profileName => { if (readCache) readCache.delete(profileName.toLowerCase()); };

    // The Plays of the Profile's year file, an empty list when it has none.
    // A file without a "plays" list is set aside like a broken one, since
    // the next Play would overwrite what may be a hand edit.
    function readPlayLog(profile, year) {
        const baseName = playLogBaseName(year);
        const label = `${profile.name}\\${baseName}.json`;
        const saved = loadJson(profile.folder, baseName, label, PLAY_LOG_VERSION);
        if (!saved) return [];
        if (Array.isArray(saved.plays)) return saved.plays;
        logRecovery(`${label} has no "plays" list; kept aside as ${setAside(profile.folder, baseName)}, starting from zero.`);
        return [];
    }

    // A year with only its backup counts: loadJson reads it in its place.
    function playLogYearsOf(profile) {
        const years = new Set();
        for (const fileName of files.listFiles(profile.folder)) {
            const match = PLAY_LOG_FILE.exec(fileName);
            if (match) years.add(Number(match[2]));
        }
        return [...years].sort((a, b) => a - b);
    }

    // Read and rewritten whole: only the year of the Play's start is touched.
    function addToPlayLog(profileName, configId, startDate, seconds) {
        const profile = profileNamed(profileName);
        const year = startDate.getFullYear();
        const plays = readPlayLog(profile, year);
        plays.push({ start: toLocalIsoString(startDate), configId, seconds });
        saveJson(profile.folder, playLogBaseName(year), { version: PLAY_LOG_VERSION, plays });
    }

    // Changes the data of the named Profile (the active one by default) and
    // saves it. A change that cannot be saved is undone and rethrown: what
    // the readers see never holds what the file does not.
    function updateProfileData(change, profileName = activeProfile.name) {
        const { profile, data } = profileWithData(profileName);
        const before = JSON.stringify(data);
        change(data);
        try {
            saveProfileData(profile, data);
        } catch (error) {
            if (data === activeData) activeData = JSON.parse(before);
            forgetCachedRead(profile.name);
            throw error;
        }
        forgetCachedRead(profile.name);
        tellUpdateListeners(profile.name, { isReset: false });
    }

    // What they hear of is saved already: one failing listener must not keep
    // the others from hearing of it.
    function tellListeners(listeners, ...args) {
        for (const listener of listeners) {
            try {
                listener(...args);
            } catch (error) {
                logHandlerError(SCRIPT_NAME, error);
            }
        }
    }
    const tellUpdateListeners = (profileName, change) => tellListeners(updateListeners, profileName, change);

    // Renames each Play Log year file to "play-log-<year>.reset-<date>.json"
    // and deletes its backup, which would otherwise bring the year back on
    // its next read. A backup without its year file is the year's data
    // (loadJson reads it), so it becomes the reset copy instead. Returns the
    // new file names.
    function keepPlayLogAsResetCopies(profile) {
        const byBaseName = new Map();
        for (const fileName of files.listFiles(profile.folder)) {
            const match = PLAY_LOG_FILE.exec(fileName);
            if (!match) continue;
            const yearFiles = byBaseName.get(match[1]) || {};
            yearFiles[match[3] ? "backup" : "main"] = fileName;
            byBaseName.set(match[1], yearFiles);
        }
        const copyNames = [];
        for (const [baseName, { main, backup }] of byBaseName) {
            const copyName = datedFileName(profile.folder, baseName, "reset");
            files.renameFile(`${profile.folder}\\${main || backup}`, `${profile.folder}\\${copyName}`);
            if (main && backup) files.deleteFile(`${profile.folder}\\${backup}`);
            copyNames.push(copyName);
        }
        return copyNames;
    }

    // The Profile Reset: the named Profile starts over as if it had never
    // played, keeping its folder (name, Avatar) and its marks. Its former
    // profile.json is first copied to "profile.reset-<date>.json", and its
    // Play Log year files renamed alike, for a mistaken reset to be undone
    // by hand.
    function resetProfile(profileName) {
        const { profile, data } = profileWithData(profileName);
        const path = `${profile.folder}\\profile.json`;
        let copyName = null;
        if (files.fileExists(path)) {
            copyName = datedFileName(profile.folder, "profile", "reset");
            files.writeText(`${profile.folder}\\${copyName}`, files.readText(path));
        }
        const keptFiles = [...(copyName ? [copyName] : []), ...keepPlayLogAsResetCopies(profile)];
        const freshData = emptyProfileData();
        for (const key of KEPT_THROUGH_RESET) {
            if (key in data) freshData[key] = data[key];
        }
        saveProfileData(profile, freshData);
        forgetCachedRead(profile.name);
        if (sameName(profile.name, activeProfile.name)) activeData = freshData;
        log(`${profile.name} was reset${keptFiles.length ? `; its former files are kept as ${keptFiles.join(", ")}` : ""}.`);
        tellUpdateListeners(profile.name, { isReset: true });
    }

    // The Profile Removal: the named Profile's folder renamed to
    // "_<name> removed <yyyy-mm-dd>" (numbered when taken), which the listing
    // ignores, its files kept for the owner to bring back by hand. Throws,
    // renaming nothing, for Guest or the active Profile; a failed rename throws.
    function removeProfile(profileName) {
        const profile = profileNamed(profileName);
        if (profile.isGuest) throw new Error("Guest is never removed.");
        if (sameName(profile.name, activeProfile.name)) throw new Error(`${profile.name} is the active Profile and cannot be removed.`);
        const date = toLocalIsoString(host.now()).slice(0, "yyyy-mm-dd".length);
        const baseName = `_${profile.name} removed ${date}`;
        let removedName = baseName;
        for (let copy = 2; files.folderExists(`${profilesFolder}\\${removedName}`); copy++) removedName = `${baseName}-${copy}`;
        files.renameFolder(profile.folder, `${profilesFolder}\\${removedName}`);
        forgetCachedRead(profile.name);
        log(`${profile.name} was removed; its folder is kept as ${removedName}.`);
        tellListeners(removeListeners, profile.name);
    }

    function logHandEditProblemOnce(problemLine) {
        if (loggedHandEditProblems.has(problemLine)) return;
        loggedHandEditProblems.add(problemLine);
        log(problemLine);
    }

    // A mark set by hand (ADR 0006) counts only when it is true on a Profile
    // other than Guest; any other value is logged and read as false, but kept
    // in the file for the player to fix. A key that differs from the mark by
    // its letter case or spaces only is a typo: logged too, never read.
    function markOf(profile, data, markName) {
        const looseName = markName.toLowerCase();
        for (const key of Object.keys(data)) {
            if (key !== markName && key.replace(/\s/g, "").toLowerCase() === looseName) {
                logHandEditProblemOnce(`${profile.name}\\profile.json: ${JSON.stringify(key)} is ignored; did you mean "${markName}"?`);
            }
        }
        const value = data[markName];
        if (value === undefined || value === false) return false;
        let problem = null;
        if (profile.isGuest) problem = `Guest is never marked "${markName}"`;
        else if (typeof value !== "boolean") problem = `"${markName}" must be true or false, not ${JSON.stringify(value)}`;
        if (!problem) return true;
        logHandEditProblemOnce(`${profile.name}\\profile.json: ${problem}; read as false.`);
        return false;
    }

    function profileHasMark(markName, profileName) {
        const { profile, data } = profileWithData(profileName);
        return markOf(profile, data, markName);
    }
    const isAdmin = (profileName = activeProfile.name) => profileHasMark("isAdmin", profileName);
    const isChild = (profileName = activeProfile.name) => profileHasMark("isChild", profileName);
    // Guest is skipped since it never counts: reading it would only log its mark on every menu opening.
    const adminProfileNames = () => listProfileNames().filter(name => !isGuestName(name) && isAdmin(name));

    // The named Profile's marks as the mark rules read them (setup_entries.js).
    function marksOf(profileName) {
        return withCachedReads(() => {
            const { profile, data } = profileWithData(profileName);
            const isAdminProfile = markOf(profile, data, "isAdmin");
            return {
                isGuest: profile.isGuest,
                isAdmin: isAdminProfile,
                isChild: markOf(profile, data, "isChild"),
                isLastAdmin: isAdminProfile && adminProfileNames().length === 1,
            };
        });
    }

    // Sets the mark (true) or clears it (the key removed, so the file holds
    // true marks only); throws, writing nothing, when the mark rules forbid it.
    function setMark(profileName, markName, isOn) {
        if (!MARK_NAMES.includes(markName)) throw new Error(`"${markName}" is not a Profile mark.`);
        const profile = profileNamed(profileName);
        const refusal = markRefusal(marksOf(profileName), markName);
        if (refusal) throw new Error(`${profile.isGuest ? "Guest" : profile.name} cannot have its "${markName}" mark changed (${refusal}).`);
        updateProfileData(changed => {
            if (isOn) changed[markName] = true;
            else delete changed[markName];
        }, profile.name);
    }

    // The named Profile's Initials, null when none. Set by hand, they count
    // only as three capital letters on a Profile other than Guest; anything
    // else is logged once and read as none, but kept in the file to fix.
    function initialsOf(profileName) {
        const { profile, data } = profileWithData(profileName);
        const value = data[INITIALS_KEY];
        if (value === undefined) return null;
        let problem = null;
        if (profile.isGuest) problem = `Guest never has "${INITIALS_KEY}"`;
        else if (!areValidInitials(value)) problem = `"${INITIALS_KEY}" must be three capital letters A-Z, not ${JSON.stringify(value)}`;
        if (!problem) return value;
        logHandEditProblemOnce(`${profile.name}\\profile.json: ${problem}; read as no initials.`);
        return null;
    }

    // The listed Profile holding these Initials in any letter case, null when none.
    function initialsHolder(initials) {
        return withCachedReads(() => listProfileNames().find(name => {
            const held = initialsOf(name);
            return held !== null && sameInitials(held, initials);
        }) || null);
    }

    // Throws, writing nothing, for Guest, anything but three letters A-Z,
    // and Initials another listed Profile holds.
    function setInitials(profileName, initials) {
        const profile = profileNamed(profileName);
        if (profile.isGuest) throw new Error("Guest never has Initials.");
        if (!areValidInitials(initials)) throw new Error(`${JSON.stringify(initials)} are not three capital letters A-Z.`);
        const holder = initialsHolder(initials);
        if (holder !== null && !sameName(holder, profile.name)) throw new Error(`The Initials ${initials} are already ${holder}'s.`);
        updateProfileData(data => { data[INITIALS_KEY] = initials; }, profile.name);
        log(`${profile.name} has the Initials ${initials}.`);
    }

    function clearInitials(profileName) {
        const profile = profileNamed(profileName);
        updateProfileData(data => { delete data[INITIALS_KEY]; }, profile.name);
        log(`${profile.name} has no Initials any more.`);
    }

    // Guest is always listed, and is not part of the Household.
    const isHouseholdEmpty = () => listProfileNames().length === 1;

    // An empty folder already reads as a Profile starting from zero, and the
    // readers list the folders afresh: nothing to write, nobody to tell, but
    // for the first Profile of an empty Household, marked here only (ADR 0023).
    // Returns the name created; throws, creating nothing, on a refused name.
    // guestNameShown: Guest's name in the current language, as the store reads no text.
    function createProfile(name, guestNameShown) {
        const refusal = nameRefusal(name, { listedNames: listProfileNames(), guestNameShown });
        if (refusal) throw new Error(`The name "${name}" cannot be used (${refusal}).`);
        const createdName = withoutTrailingHyphen(name);
        const isFirstProfile = isHouseholdEmpty();
        files.createFolder(`${profilesFolder}\\${createdName}`);
        log(`The Profile "${createdName}" was created.`);
        if (isFirstProfile) markFirstProfile(createdName);
        return createdName;
    }

    // The new Avatar worn at once by the active Profile, then told by the
    // folder's name: the file name may not change (avatar.png over avatar.png).
    function tellAvatarChanged(folderName) {
        if (sameName(folderName, activeProfile.name)) activeProfile = profileAt(folderName);
        tellListeners(avatarListeners, folderName);
    }

    // An avatar.png records nothing: a copy of a pack portrait is known by
    // its file's size, as Avatar Choice knows it. Anything else is a photo.
    function isPortraitCopy(path) {
        const info = files.getFileInfo(path);
        if (!info) return false;
        return files.listFiles(packPortraitsFolder).filter(name => PACK_PORTRAIT_FILE.test(name)).some(name => {
            const portrait = files.getFileInfo(`${packPortraitsFolder}\\${name}`);
            return Boolean(portrait) && portrait.size === info.size;
        });
    }

    const isOwnPictureInUse = (folder, place) => {
        const path = `${folder}\\${place.inUse}`;
        return files.fileExists(path) && (place.inUse !== PORTRAIT_COPY_FILE || !isPortraitCopy(path));
    };

    // The photo in use renamed to its ".bak", replacing an older one, then
    // step() run. When the rename or step throws, every file is put back.
    function setAsideAround(folderName, place, step) {
        const folder = `${profilesFolder}\\${folderName}`;
        const [inUse, setAside, older] = [place.inUse, place.setAside, place.older].map(name => `${folder}\\${name}`);
        // Moved out of the way, not deleted, until the photo in use is set aside.
        const replacesOlder = files.fileExists(setAside);
        if (replacesOlder) files.renameFile(setAside, older);
        let isSetAside = false;
        try {
            files.renameFile(inUse, setAside);
            isSetAside = true;
            step();
        } catch (error) {
            if (isSetAside) files.renameFile(setAside, inUse);
            if (replacesOlder) files.renameFile(older, setAside);
            throw error;
        }
        if (replacesOlder) files.deleteFile(older);
        log(`${folderName}\\${place.inUse} was set aside as ${place.setAside}`
            + `${replacesOlder ? `, replacing the older ${place.setAside}` : ""}.`);
    }

    // Copies imagePath as the named Profile's avatar.png; nothing records
    // which image it was. A photo there is set aside first, as
    // avatar.png.bak; a portrait's copy is replaced. Then the avatar.jpg in
    // use, which would hide the copy, is set aside as avatar.jpg.bak. Each
    // ".bak" replaces an older one. Throws when a step fails: a failed copy
    // changes nothing, a failed rename leaves the photo worn.
    function giveAvatar(profileName, imagePath) {
        const folderName = listedFolderOf(profileName);
        const folder = `${profilesFolder}\\${folderName}`;
        const [jpegPlace, pngPlace] = OWN_PICTURE_PLACES;
        const copy = () => files.copyFile(imagePath, `${folder}\\${PORTRAIT_COPY_FILE}`);
        if (isOwnPictureInUse(folder, pngPlace)) setAsideAround(folderName, pngPlace, copy);
        else copy();
        log(`The Profile "${folderName}" was given the Avatar ${imagePath}.`);
        if (isOwnPictureInUse(folder, jpegPlace)) setAsideAround(folderName, jpegPlace, () => {});
        tellAvatarChanged(folderName);
    }

    // The readable photo in use, avatar.jpg first, or else a set-aside one;
    // null when there is none.
    function ownPictureIn(folder) {
        const readable = path => files.fileExists(path) && files.isImageReadable(path);
        for (const place of OWN_PICTURE_PLACES) {
            const path = `${folder}\\${place.inUse}`;
            if (isOwnPictureInUse(folder, place) && readable(path)) return { path, isInUse: true, place };
        }
        for (const place of OWN_PICTURE_PLACES) {
            const path = `${folder}\\${place.setAside}`;
            if (readable(path)) return { path, isInUse: false, place };
        }
        return null;
    }

    // The named Profile's photo as { path, isInUse }; null when it has no readable one.
    function getOwnPictureOf(profileName) {
        const ownPicture = ownPictureIn(listedFolderPathOf(profileName));
        return ownPicture ? { path: ownPicture.path, isInUse: ownPicture.isInUse } : null;
    }

    // The set-aside photo renamed back to its own name: avatar.jpg wins over
    // avatar.png, and avatar.png.bak replaces the portrait's copy, which the
    // pack still has. Nothing when a photo is in use; throws when a rename fails.
    function wearOwnPicture(profileName) {
        const folderName = listedFolderOf(profileName);
        const folder = `${profilesFolder}\\${folderName}`;
        const ownPicture = ownPictureIn(folder);
        if (ownPicture && ownPicture.isInUse) return;
        if (!ownPicture) throw new Error(`The Profile "${folderName}" has no set-aside Own Picture to wear.`);
        const { place } = ownPicture;
        const inUse = `${folder}\\${place.inUse}`;
        if (files.fileExists(inUse)) {
            // The portrait's copy waits under the older name until the photo is back.
            const portraitCopy = `${folder}\\${place.older}`;
            files.renameFile(inUse, portraitCopy);
            try {
                files.renameFile(ownPicture.path, inUse);
            } catch (error) {
                files.renameFile(portraitCopy, inUse);
                throw error;
            }
            files.deleteFile(portraitCopy);
        } else {
            files.renameFile(ownPicture.path, inUse);
        }
        log(`${folderName}\\${place.setAside} is worn again as ${place.inUse}.`);
        tellAvatarChanged(folderName);
    }

    // The listed Profile holding the History Import's record, null while none does.
    function historyImportProfile() {
        return withCachedReads(() => listProfileNames().find(name => isRecord(profileWithData(name).data[HISTORY_IMPORT_KEY])) || null);
    }

    // What the PinballY History adds to each table (ADR 0025): PinballY's
    // count and seconds minus every listed Profile's, Guest's included, never
    // below zero; Untracked Tables left out. Only the tables with something left.
    function historyLeftOver(tables) {
        return withCachedReads(() => {
            const everyPlays = listProfileNames().map(name => profileWithData(name).data.plays);
            const counted = (configId, field) => everyPlays.reduce((sum, plays) => sum + (Number((plays[configId] || NO_PLAY)[field]) || 0), 0);
            const leftOver = [];
            for (const game of tables) {
                if (!game.configId || isUntrackedTable(game)) continue;
                const count = Math.max(0, Math.round(Number(game.playCount) || 0) - counted(game.configId, "count"));
                const seconds = Math.max(0, Math.round(Number(game.playTime) || 0) - counted(game.configId, "seconds"));
                if (count > 0 || seconds > 0) leftOver.push({ game, count, seconds });
            }
            return leftOver;
        });
    }

    const summaryOf = leftOver => ({
        tableCount: leftOver.length,
        games: leftOver.reduce((sum, { count }) => sum + count, 0),
        seconds: leftOver.reduce((sum, { seconds }) => sum + seconds, 0),
    });

    // The History Import into the named Profile, in one save with its record:
    // it fully happens or not at all. PinballY's last-played date is taken
    // only for a table the Profile had never played. Never writes the Play Log.
    // The same save leaves the Profile silent (ADR 0025): its kept Collection
    // Tier raised to collectionTierOf(its new data), and an unannounced
    // Achievements check due. Returns { tableCount, games, seconds } added;
    // throws, writing nothing, for Guest or once the cabinet's import is done.
    function importHistory(profileName, tables, { collectionTierOf = () => 0 } = {}) {
        const profile = profileNamed(profileName);
        if (profile.isGuest) throw new Error("Guest never takes over the PinballY History.");
        const importer = historyImportProfile();
        if (importer) throw new Error(`The PinballY History was already taken over by ${importer}.`);
        const leftOver = historyLeftOver(tables);
        updateProfileData(data => {
            for (const { game, count, seconds } of leftOver) {
                const play = data.plays[game.configId] || NO_PLAY;
                const neverPlayed = !(play.count > 0);
                const lastPlayed = neverPlayed && isValidDate(game.lastPlayed) ? toLocalIsoString(game.lastPlayed) : play.lastPlayed;
                data.plays[game.configId] = {
                    count: (Number(play.count) || 0) + count, seconds: (Number(play.seconds) || 0) + seconds, lastPlayed,
                };
            }
            // Kept only once a tier is reached, as the Table Mastery Add-on does.
            const tier = collectionTierOf(data);
            if (tier > (data.collectionTier || 0)) data.collectionTier = tier;
            data[UNANNOUNCED_CHECK_KEY] = true;
            data[HISTORY_IMPORT_KEY] = { date: toLocalIsoString(host.now()) };
        }, profile.name);
        const summary = summaryOf(leftOver);
        log(`${profile.name} took over the PinballY History: ${summary.games} games, ${summary.seconds} seconds on ${summary.tableCount} tables.`);
        return summary;
    }

    // A mark that cannot be saved keeps the Profile: with no Admin Profile,
    // everyone still sees the setup entries and Manage profiles offers the mark.
    function markFirstProfile(profileName) {
        try {
            setMark(profileName, "isAdmin", true);
        } catch (error) {
            logHandlerError(SCRIPT_NAME, error);
        }
    }

    function switchTo(name) {
        const profile = findProfile(name);
        if (!profile) throw new Error(`No Profile named "${name}".`);
        const data = readProfileData(profile);
        activeProfile = profile;
        activeData = data;
        cabinet.activeProfile = profile.name;
        saveCabinet();
        tellListeners(switchListeners, publicProfile(activeProfile));
    }

    // The Profile active at "gamestarted" and when the game started, by table.
    const runningGames = new Map();

    // Fires on table launch.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, ev => {
        runningGames.set(ev.game.configId, { profileName: activeProfile.name, startMs: host.now().getTime() });
    }));

    // Fires on table exit: a Play, and only a Play, enters the table totals
    // (with its seconds as PinballY counts them) and the Play Log, then is
    // announced. The listeners run synchronously, so they finish before the
    // Achievements check, which is deferred.
    host.on("gameover", safeHandler(SCRIPT_NAME, ev => {
        const { configId } = ev.game;
        const now = host.now();
        const running = runningGames.get(configId);
        runningGames.delete(configId);
        if (!running || isUntrackedTable(ev.game)) return;
        const seconds = Math.round((now.getTime() - running.startMs) / 1000);
        if (seconds < MIN_PLAY_SECONDS) return;
        const { profileName } = running;
        const start = new Date(running.startMs);

        try {
            updateProfileData(data => {
                const play = data.plays[configId] || NO_PLAY;
                data.plays[configId] = {
                    count: play.count + 1,
                    seconds: play.seconds + seconds,
                    lastPlayed: toLocalIsoString(now),
                };
            }, profileName);
        } catch (error) {
            // Nothing was saved, so nothing is announced.
            logHandlerError(SCRIPT_NAME, error);
            tellListeners(playFailedListeners, { profileName, configId, isCounted: false });
            return;
        }
        // The Play is in the totals already: a Play Log that cannot be
        // written must not keep it from being announced.
        let playLogFailed = false;
        try {
            addToPlayLog(profileName, configId, start, seconds);
        } catch (error) {
            logHandlerError(SCRIPT_NAME, error);
            playLogFailed = true;
        }
        tellListeners(playListeners, { profileName, configId, start, seconds });
        // After the Play's listeners, so its Error Toast queues behind the Play's other toasts.
        if (playLogFailed) tellListeners(playFailedListeners, { profileName, configId, isCounted: true });
    }));

    return {
        listProfiles: () => listProfileRecords().map(publicProfile),
        // The same Profiles by name only, without checking their Avatars.
        listProfileNames,
        getActiveProfile: () => ({ ...publicProfile(activeProfile), data: activeData }),
        // Whether the Household has no Profile; re-read on every call.
        isHouseholdEmpty,
        createProfile,
        // The named Profile's avatar.png becomes a copy of the image, its Own Picture set aside.
        giveAvatar,
        // { path, isInUse } of the named Profile's Own Picture, null when none.
        getOwnPictureOf,
        wearOwnPicture,
        switchTo,
        getProfileData: () => activeData,
        // The named Profile's data, to read only: change it with updateProfileData.
        getProfileDataOf: (profileName) => profileWithData(profileName).data,
        withCachedReads,
        // The active Profile's play record of a table, all zero when never played.
        getPlay: (configId) => activeData.plays[configId] || NO_PLAY,
        hasPlayed: (configId) => (activeData.plays[configId] || NO_PLAY).count > 0,
        // Every play record of the named Profile, by table.
        getPlaysOf: (profileName) => profileWithData(profileName).data.plays,
        // The named Profile's best Rocket Game scores, { score, date }; none before its first.
        getRocketScoresOf: (profileName) => {
            const scores = profileWithData(profileName).data.rocketScores;
            return Array.isArray(scores) ? scores : [];
        },
        // The Plays of the named Profile's Play Log started in that year, in
        // the order they ended; an empty list when the year has none.
        getPlayLogOf: (profileName, year) => readPlayLog(profileNamed(profileName), year),
        // The years of the named Profile's Play Log files, oldest first; its
        // reset copies are not among them.
        getPlayLogYearsOf: (profileName) => playLogYearsOf(profileNamed(profileName)),
        // The IDs of the Achievements the named Profile was Notified of.
        getNotifiedOf: (profileName) => profileWithData(profileName).data.notified,
        updateProfileData,
        // Erases the named Profile's plays, Streaks, session stats, Random
        // Games, Challenge progress, World Tour, Surprises, Rocket Game scores
        // and Notified Achievements.
        resetProfile,
        // Sets the named Profile's folder aside: the cabinet forgets it (never Guest nor the active one).
        removeProfile,
        // Whether the named Profile (the active one by default) is an Admin Profile.
        isAdmin,
        // Whether any Profile is an Admin Profile; re-read on every call, so a hand edit shows up.
        hasAdminProfile: () => adminProfileNames().length > 0,
        // Whether the named Profile (the active one by default) is a Child Profile.
        isChild,
        // { isGuest, isAdmin, isChild, isLastAdmin } of the named Profile.
        getMarksOf: marksOf,
        setMark,
        // The named Profile's Initials ("FEL"), null when none (ADR 0026).
        getInitialsOf: initialsOf,
        setInitials,
        clearInitials,
        // The listed Profile holding these Initials, in any letter case; null when none.
        findInitialsHolder: initialsHolder,
        // { tableCount, games, seconds } the History Import would add from these tables, without writing.
        previewHistoryImport: (profileName, tables) => withCachedReads(() => {
            // Throws for an unknown Profile, as importHistory would.
            profileNamed(profileName);
            return summaryOf(historyLeftOver(tables));
        }),
        importHistory,
        // The name of the Profile that took over the PinballY History, null before the import.
        getHistoryImportProfile: historyImportProfile,
        // Whether the named Profile's next Achievements check is unannounced (after a History Import).
        isUnannouncedCheckDue: (profileName) => profileWithData(profileName).data[UNANNOUNCED_CHECK_KEY] === true,
        // The named Profile's next Achievements check becomes unannounced (after a claim by Initials).
        markUnannouncedCheckDue: (profileName) => updateProfileData(data => { data[UNANNOUNCED_CHECK_KEY] = true; }, profileNamed(profileName).name),
        // Ends that check in one save: these Achievement IDs become Notified.
        endUnannouncedCheck: (profileName, ids) => updateProfileData(data => {
            for (const id of ids) if (!data.notified.includes(id)) data.notified.push(id);
            delete data[UNANNOUNCED_CHECK_KEY];
        }, profileName),
        getCabinetData: () => cabinet,
        // Another module's cabinet-level file, "<baseName>.json" next to
        // cabinet.json: its data, or null when it was never saved. Its
        // version is the other module's to check, unless it gives codeVersion
        // for a newer file to be set aside like the store's own.
        readCabinetFile: (baseName, codeVersion) => loadJson(profilesFolder, baseName, `${baseName}.json`, codeVersion),
        saveCabinetFile: (baseName, data) => saveJson(profilesFolder, baseName, data),
        // Whether that file or its backup is there, readable or not: asked before
        // readCabinetFile, it tells a file never saved from one set aside as unreadable.
        hasCabinetFile: (baseName) => files.fileExists(`${profilesFolder}\\${baseName}.json`)
            || files.fileExists(`${profilesFolder}\\${baseName}.bak.json`),
        // Another module's file of the named Profile, "<baseName>.json" in its
        // folder, under the same rules; never touched by a Profile Reset.
        readProfileFile: (profileName, baseName, codeVersion) =>
            loadJson(listedFolderPathOf(profileName), baseName, `${listedFolderOf(profileName)}\\${baseName}.json`, codeVersion),
        saveProfileFile: (profileName, baseName, data) => saveJson(listedFolderPathOf(profileName), baseName, data),
        updateCabinetData: (change) => {
            change(cabinet);
            saveCabinet();
        },
        onSwitch: (listener) => { switchListeners.push(listener); },
        // listener(profileName, { isReset }): after any change of a Profile's
        // data is saved; isReset when the Profile was reset.
        onUpdate: (listener) => { updateListeners.push(listener); },
        // listener(profileName): after the named Profile was given an Avatar.
        onAvatarChange: (listener) => { avatarListeners.push(listener); },
        // listener(profileName): after the named Profile was removed; its data
        // can no longer be read, so the listener only forgets what it kept of it.
        onRemove: (listener) => { removeListeners.push(listener); },
        // listener(): after a Profile Reset of the active Profile is saved.
        onActiveProfileReset: (listener) => {
            updateListeners.push((profileName, { isReset }) => {
                if (isReset && sameName(profileName, activeProfile.name)) listener();
            });
        },
        // listener({ profileName, configId, start, seconds }): after a Play is
        // saved; profileName is the Profile active at its start.
        onPlay: (listener) => { playListeners.push(listener); },
        // listener({ profileName, configId, isCounted }): after a Play that
        // could not be saved (isCounted false, never announced) or not kept
        // in the Play Log (isCounted true, announced first).
        onPlayFailed: (listener) => { playFailedListeners.push(listener); },
    };
}

let sharedProfileStore = null;

// One store for every Add-on, so they all see the same active Profile.
export function getProfileStore() {
    if (!sharedProfileStore) sharedProfileStore = createProfileStore(createPinballYHost());
    return sharedProfileStore;
}
