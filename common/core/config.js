// ============================================================
// Player settings for the PinballY scripts in this project, with neutral
// defaults. Each player overrides them in a git-ignored .env.local in the
// pack's folder (copy .env.example), read synchronously at load time; the
// overridden keys and any invalid line are written to the PinballY log.
// Sound paths may be relative to the pack's folder.
// ============================================================

import { applyEnvOverrides } from "./env_overrides.js";
import { projectFolderOf } from "./pinbally_host.js";
import { logError } from "./error_log.js";

// The sounds shipped in assets\sounds\, by setting.
export const SHIPPED_SOUNDS = Object.freeze({
    // Played when a table launches.
    launchSoundFile: "assets\\sounds\\launch.mp3",
    // Played with each Achievement Toast.
    achievementSoundFile: "assets\\sounds\\achievement.wav",
    // Played with each Profile Greeting.
    profileGreetingSoundFile: "assets\\sounds\\profile_greeting.mp3",
    // Played once when a Confetti Shower starts.
    confettiSoundFile: "assets\\sounds\\confetti.wav",
    // Played once when the Fireworks start.
    fireworksSoundFile: "assets\\sounds\\fireworks.wav",
});
// The sounds with nothing shipped: silent until the player sets one.
const UNSHIPPED_SOUNDS = Object.freeze({
    // Played once when the Profile picker appears as the Startup Screen.
    profilePickerSoundFile: "",
    // Played once when Avatar Choice shows, after Name Entry.
    avatarChoiceSoundFile: "",
});
const SOUND_SETTINGS = [...Object.keys(SHIPPED_SOUNDS), ...Object.keys(UNSHIPPED_SOUNDS)];
const NO_SOUNDS = Object.fromEntries(SOUND_SETTINGS.map(key => [key, ""]));

// Also what the eXpansion Pack Settings parse a fresh read of .env.local
// against; frozen below, addOns included, so never changed.
export const DEFAULTS = {
    // --- Set these for your setup ---

    // Interface language: "en", "fr", "de", "es", "it" or "pt".
    language: "en",
    // Sounds: by default the ones shipped in assets\sounds\ (see CREDITS.md
    // there), or none. A path relative to the pack's folder (such as
    // assets\sounds\local\launch.mp3, kept out of git) or an absolute one.
    // Empty = no sound.
    ...SHIPPED_SOUNDS,
    ...UNSHIPPED_SOUNDS,
    // Manufacturer name you gave fictional/community VPX tables in PinballY.
    // Used by the status line and the "Original Tables" filter.
    communityTablesManufacturer: "VPX Community",
    // PinballY category of the Adult Tables, which a Child Profile never sees (exact name).
    adultCategory: "NSFW",

    // --- Optional preferences ---

    // The first screen PinballY shows: "profilePicker" (the default: the
    // Profile picker, then the Welcome Screen; skipped while the Household
    // has fewer than two Profiles), "welcome" (the Welcome Screen) or
    // "wheel" (the bare wheel). One whose Add-on is off gives way to the
    // next, from the Profile picker to the Welcome Screen to the wheel.
    startupScreen: "profilePicker",
    // true = the random game jumps straight to the table, without the wheel animation.
    skipRandomGameAnimation: false,
    // Total play time (in minutes) on a table before you're asked to rate it.
    askToRateAfterMinutesPlayed: 60,
    // Seconds an Achievement Toast stays fully visible (above 0, at most 60).
    achievementToastSeconds: 4,
    // Size of an Achievement Toast: 1 = the original card, 2 = twice as large (from 0.5 to 3).
    achievementToastScale: 1.0,
    // false = no Confetti Shower with the toast of a completed Challenge, a
    // Platinum Achievement, Mastery Level 10 or a new Collection Tier
    // (nothing is drawn ahead for it, no sound plays), for a PC that
    // struggles with it.
    confetti: true,
    // false = no Fireworks with a Level Toast (nothing is drawn ahead for
    // them, no sound plays), for a PC that struggles with them.
    fireworks: true,
    // false = PinballY never asks GitHub for a newer Pack Version at its
    // start, and never offers to update the pack. A git checkout is never
    // checked either way. In the Settings' Offline Mode group.
    updateCheck: true,
    // false = the pack never offers to install or update vpxtool; the
    // install line stays in the Settings. In the Settings' Offline Mode group.
    offerVpxtool: true,
    // The Discord application whose name and art Discord Rich Presence
    // shows; empty for the pack's.
    discordApplicationId: "",
    // true = every PinballY menu title shown without a translation is written
    // to the PinballY log (for a new PinballY version or a new language).
    logUntranslatedMenuTitles: false,
    // true = every launch event is written to the PinballY log with a
    // millisecond timestamp (to check their order on the cabinet).
    logLaunchEvents: false,

    // --- Add-ons ---

    // Set any Add-on to false to keep it from starting. Menu Cleanup is off
    // by default, as it removes PinballY entries others may want, the
    // Backglass Clock, as it covers a corner of every table's backglass, and
    // Discord Rich Presence, as it makes the tables played public.
    addOns: {
        uiTranslation: true,
        statusLineInfo: true,
        // The Welcome Screen, under the startup prompt's former key.
        startupChoicePrompt: true,
        forceBackglass: true,
        // The time in front of VPX's backglass while a table runs, on two screens or more.
        backglassClock: false,
        // The table being played, on the Discord account signed in on this PC.
        // Also in the Settings' Offline Mode group.
        discordRichPresence: false,
        customMenuCommands: true,
        // "Launch a random table" in the main menu, under Play.
        randomGame: true,
        customFilter: true,
        hallOfFame: true,
        tablesToDiscover: true,
        hiddenTables: true,
        sessionStatsTracker: true,
        achievements: true,
        seamlessLaunchOverlay: true,
        playLaunchSound: true,
        ratingPrompt: true,
        profilePicker: true,
        clock: true,
        // Icons beside the clock: a Pack Update waiting, the Update Check off.
        statusIcons: true,
        wheelArc: true,
        challenges: true,
        tableMastery: true,
        // Fills each table's empty ROM field from its script (vpxtool in the pack's tools folder).
        tableRoms: true,
        // Credits each score that enters a ROM table's board to the Profile that played.
        highScores: true,
        // The main menu drawn in the pack's look instead of PinballY's native one.
        drawnMenus: true,
        // Writes the launch events to the log, only when logLaunchEvents is on.
        launchEventsTrace: true,
        menuCleanup: false,
    },
};

Object.freeze(DEFAULTS.addOns);
Object.freeze(DEFAULTS);

const SCRIPT_NAME = "Config";
const LOG_PREFIX = `[${SCRIPT_NAME}]`;
const ADODB_TEXT_TYPE = 2;
const ADODB_READ_ALL = -1;

// A drive letter ("C:\\", "d:/"), a network path ("\\\\server\\share") or
// the root of the current drive ("\\sounds").
const ABSOLUTE_PATH_PATTERN = /^([A-Za-z]:|[\\/])/;

// The configuration with each non-empty, relative sound path made absolute
// from the pack's folder: Windows Media Player knows nothing of the pack.
export function resolveSoundFiles(config, projectFolder) {
    const resolved = { ...config };
    for (const key of SOUND_SETTINGS) {
        const path = resolved[key];
        if (typeof path !== "string" || path === "" || ABSOLUTE_PATH_PATTERN.test(path)) continue;
        resolved[key] = `${projectFolder}\\${path.replace(/\//g, "\\").replace(/^\.\\/, "")}`;
    }
    return resolved;
}

// Returns the text of the .env.local at that path, or null when there is none.
// Read through COM (not an async API) because modules read the configuration
// while they load; ADODB.Stream decodes UTF-8, so accented paths survive.
function readEnvLocal(path) {
    const fileSystem = createAutomationObject("Scripting.FileSystemObject");
    if (!fileSystem.FileExists(path)) return null;

    const stream = createAutomationObject("ADODB.Stream");
    stream.Type = ADODB_TEXT_TYPE;
    stream.Charset = "utf-8";
    stream.Open();
    try {
        stream.LoadFromFile(path);
        return stream.ReadText(ADODB_READ_ALL);
    } finally {
        stream.Close();
    }
}

// The running configuration's own copy, addOns included: tests turn
// Add-ons on and off in it, and DEFAULTS are frozen.
const copyOfDefaults = () => ({ ...DEFAULTS, addOns: { ...DEFAULTS.addOns } });

function loadConfig() {
    // Under Node (tests) there is no COM and no pack folder: the defaults
    // apply without the shipped sounds, which each test sets as it needs.
    if (typeof createAutomationObject !== "function") return { ...copyOfDefaults(), ...NO_SOUNDS };

    const projectFolder = projectFolderOf(systemInfo.programDir);
    const path = `${projectFolder}\\.env.local`;
    let text;
    try {
        text = readEnvLocal(path);
    } catch (error) {
        logError(SCRIPT_NAME, `ERROR reading ${path}, using defaults: ${error.message}`, null, error);
        return resolveSoundFiles(copyOfDefaults(), projectFolder);
    }
    if (text === null) {
        logfile.log(`${LOG_PREFIX} No .env.local found at ${path}; using defaults.`);
        return resolveSoundFiles(copyOfDefaults(), projectFolder);
    }

    const { config, overridden, problems } = applyEnvOverrides(DEFAULTS, text);
    logfile.log(`${LOG_PREFIX} .env.local overrides: ${overridden.length > 0 ? overridden.join(", ") : "none"}.`);
    for (const problem of problems) {
        logfile.log(`${LOG_PREFIX} .env.local ${problem}; ignored.`);
    }
    return resolveSoundFiles(config, projectFolder);
}

export default loadConfig();
