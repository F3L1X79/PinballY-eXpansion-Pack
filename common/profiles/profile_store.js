// ============================================================
// Profile store: the only module that knows the Profiles folder (one sub-folder
// per Profile: Avatar, profile.json, Play Log; cabinet.json for the household).
// Decides which game is a Play (ADR 0007) and tells its listeners of each
// switch, update and Play (onPlay, ADR 0008). Handles the Profile Reset.
// Listens to "gamestarted" / "gameover"; tells of a Play it could not save or log (onPlayFailed).
// - Every write is whole: tmp, backup, rename; a broken or newer file comes back from its backup.
// - isAdmin and isChild: by hand or setMark, which writes true or removes the key (ADR 0020); a first Profile created gets isAdmin (ADR 0023).
// - Other cabinet-level files sit next to cabinet.json; no Profile Reset touches them.
// - Another Profile's profile.json is read afresh on each call, but once per withCachedReads run.
// ============================================================

import { safeHandler, logHandlerError } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { markRefusal } from "./setup_entries.js";
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

const isGuestName = name => sameName(name, GUEST_NAME);
// A player parks or hides a Profile by renaming its folder.
const isIgnoredFolder = name => name.startsWith(".") || name.startsWith("_");
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const pad = number => String(number).padStart(2, "0");

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
    const files = host.files;
    const switchListeners = [];
    const updateListeners = [];
    const playListeners = [];
    const playFailedListeners = [];
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    // Logged once per session: the picker lists the Profiles on every opening.
    const loggedUnreadableAvatars = new Set();
    // Logged once per session too: the menus check the marks on every opening.
    const loggedMarkProblems = new Set();

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
        const folderName = listProfileNames().find(folder => sameName(folder, name));
        return folderName === undefined ? null : profileAt(folderName);
    }

    // The file's data, or null when it is missing, not JSON or not an object;
    // the cause of an unreadable file is logged here, its outcome by the caller.
    function tryReadJson(path) {
        if (!files.fileExists(path)) return null;
        try {
            const data = JSON.parse(files.readText(path));
            if (isRecord(data)) return data;
            log(`${path} does not hold a JSON object.`);
        } catch (error) {
            log(`${path} cannot be read: ${error.message}`);
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
        log(`${folder}\\${name}.json has version ${data.version}, newer than this pack's ${codeVersion};`
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
            log(`${label} is ${newerFile ? "newer" : "missing or unreadable"}; restored from its backup`
                + `${asideFile ? ` (${asideKind} file kept as ${asideFile})` : ""}.`);
            return backup;
        }
        const asideFiles = asideFile ? [asideFile] : [];
        if (newerBackup) asideFiles.push(newerBackup);
        else if (files.fileExists(backupPath)) asideFiles.push(setAside(folder, `${baseName}.bak`));
        const problem = newerFile || newerBackup ? "cannot be read by this pack" : "are unreadable";
        log(`${label} and its backup ${problem}; kept aside as ${asideFiles.join(" and ")}, starting from zero.`);
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
        log(`${label} has no "plays" list; kept aside as ${setAside(profile.folder, baseName)}, starting from zero.`);
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
        for (const markName of MARK_NAMES) {
            if (markName in data) freshData[markName] = data[markName];
        }
        saveProfileData(profile, freshData);
        forgetCachedRead(profile.name);
        if (sameName(profile.name, activeProfile.name)) activeData = freshData;
        log(`${profile.name} was reset${keptFiles.length ? `; its former files are kept as ${keptFiles.join(", ")}` : ""}.`);
        tellUpdateListeners(profile.name, { isReset: true });
    }

    function logMarkProblemOnce(problemLine) {
        if (loggedMarkProblems.has(problemLine)) return;
        loggedMarkProblems.add(problemLine);
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
                logMarkProblemOnce(`${profile.name}\\profile.json: ${JSON.stringify(key)} is ignored; did you mean "${markName}"?`);
            }
        }
        const value = data[markName];
        if (value === undefined || value === false) return false;
        let problem = null;
        if (profile.isGuest) problem = `Guest is never marked "${markName}"`;
        else if (typeof value !== "boolean") problem = `"${markName}" must be true or false, not ${JSON.stringify(value)}`;
        if (!problem) return true;
        logMarkProblemOnce(`${profile.name}\\profile.json: ${problem}; read as false.`);
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
        if (!running) return;
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
        // Games, Challenge progress, World Tour, Surprises and Notified Achievements.
        resetProfile,
        // Whether the named Profile (the active one by default) is an Admin Profile.
        isAdmin,
        // Whether any Profile is an Admin Profile; re-read on every call, so a hand edit shows up.
        hasAdminProfile: () => adminProfileNames().length > 0,
        // Whether the named Profile (the active one by default) is a Child Profile.
        isChild,
        // { isGuest, isAdmin, isChild, isLastAdmin } of the named Profile.
        getMarksOf: marksOf,
        setMark,
        getCabinetData: () => cabinet,
        // Another module's cabinet-level file, "<baseName>.json" next to
        // cabinet.json: its data, or null when it was never saved. Its
        // version is the other module's to check, not the store's.
        readCabinetFile: (baseName) => loadJson(profilesFolder, baseName, `${baseName}.json`),
        saveCabinetFile: (baseName, data) => saveJson(profilesFolder, baseName, data),
        updateCabinetData: (change) => {
            change(cabinet);
            saveCabinet();
        },
        onSwitch: (listener) => { switchListeners.push(listener); },
        // listener(profileName, { isReset }): after any change of a Profile's
        // data is saved; isReset when the Profile was reset.
        onUpdate: (listener) => { updateListeners.push(listener); },
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
