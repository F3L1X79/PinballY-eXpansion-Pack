// ============================================================
// Entry point loaded by PinballY: installs the Easter Eggs' first listeners, reads the window's size at init, loads the Profile store, logs the startup
// summary, keeps the Adult Tables off a Child Profile's wheel, switches to Guest
// without the Profile picker, resolves the Startup Screen, restores the quiet wheel's
// volume, starts the Play Error Toasts, initializes SCRIPTS in order but those off in
// config.addOns (the eXpansion Pack Settings before Drawn Menus), then the Update result and Prompt, the PinballY Version Notice and the Update Check.
// - A script whose init() throws is logged, Error Log included, and skipped, so the others still load.
// - LOG_STARTUP_TIMING logs each init time.
// ============================================================

import config from "./common/core/config.js";
import { getProfileStore } from "./common/profiles/profile_store.js";
import { installChildWheelFilter } from "./common/tables/adult_tables.js";
import { getStartupScreen } from "./common/core/startup_screen.js";
import { getQuietWheel } from "./common/core/quiet_wheel.js";
import { createPinballYHost } from "./common/core/pinbally_host.js";
import { writeStartupSummary } from "./common/core/startup_summary.js";
import { startExpansionPackSettings } from "./common/settings/expansion_pack_settings.js";
import { startUpdateCheck } from "./common/updates/update_check.js";
import { startUpdatePrompt } from "./common/updates/update_prompt.js";
import { startUpdateResult } from "./common/updates/update_result.js";
import { startVersionNotice } from "./common/updates/version_notice.js";
import { logError } from "./common/core/error_log.js";
import { startPlayErrorToasts } from "./common/achievements/play_error_toasts.js";
import { getWindowLayout } from "./common/core/window_layout.js";

// Logs each script's init duration (ms), to help find a slow-starting script.
const LOG_STARTUP_TIMING = true;
// The script name of main.js in the Error Log.
const SCRIPT_NAME = "Startup";

import * as uiTranslation from "./addons/ui_translation.js";
import * as statusLineInfo from "./addons/status_line_info.js";
import * as customMenuCommands from "./addons/custom_menu_commands.js";
import * as randomGame from "./addons/random_game.js";
import * as rocketGame from "./addons/rocket_game.js";
import * as customFilter from "./addons/custom_filter.js";
import * as hallOfFame from "./addons/hall_of_fame.js";
import * as tablesToDiscover from "./addons/tables_to_discover.js";
import * as hiddenTables from "./addons/hidden_tables.js";
import * as wheelOrder from "./addons/wheel_order.js";
import * as menuCleanup from "./addons/menu_cleanup.js";
import * as profilePicker from "./addons/profile_picker.js";
import * as profileRatings from "./addons/profile_ratings.js";
import * as clock from "./addons/clock.js";
import * as statusIcons from "./addons/status_icons.js";
import * as wheelArc from "./addons/wheel_arc.js";
import * as seamlessLaunchOverlay from "./addons/seamless_launch_overlay.js";
import * as forceBackglass from "./addons/force_backglass.js";
import * as backglassClock from "./addons/backglass_clock.js";
import * as discordRichPresence from "./addons/discord_rich_presence.js";
import * as playLaunchSound from "./addons/play_launch_sound.js";
import * as sessionStatsTracker from "./addons/session_stats_tracker.js";
import * as achievementsEngine from "./addons/achievements_engine.js";
import * as challenges from "./addons/challenges.js";
import * as tableMastery from "./addons/table_mastery.js";
import * as ratingPrompt from "./addons/rating_prompt.js";
import * as tableRoms from "./addons/table_roms.js";
import * as highScores from "./addons/high_scores.js";
import * as welcomeScreen from "./addons/welcome_screen.js";
import * as drawnMenus from "./addons/drawn_menus.js";
import * as launchEventsTrace from "./addons/launch_events_trace.js";
import * as easterEggs from "./addons/easter_eggs.js";

const host = createPinballYHost();

// Scripts are initialized in this order, which is also the order their event
// listeners are registered in, and listeners for the same event run in that
// order too:
// - uiTranslation must come first, so its "menuopen" hook is in place before
//   any menu opens.
// - launchEventsTrace comes right after it, so each launch event is logged
//   before any other Add-on handles it.
// - sessionStatsTracker is kept before achievements as a safety margin; the
//   achievement checks after a game are deferred by one tick, so the stats
//   are recorded first either way (the startup check needs no stats from
//   this session).
// - highScores comes after sessionStatsTracker and tableRoms, and before
//   achievements: a ROM Table ROMs confirms after a game must be in
//   PinballY before the High Scores read the board again.
// - menuCleanup must come before customMenuCommands, the first script
//   using the main menu module: that module's "menuopen" listener must
//   see the main menu as Menu Cleanup left it, so that the filter groups
//   it removes stay out of the Filter Picker.
// - profileRatings comes after challenges and tableMastery: its Rating
//   Plate asks where their Challenge Card and Mastery Bar end, once they
//   have followed the same event.
// - profilePicker must come before the Welcome Screen, which offers
//   "Change Player" only when the picker registered itself at init.
// - drawnMenus must come after every Add-on and shared module that edits the
//   entries, so its "menuopen" listener draws the final ones.
// - easterEggs is not in config.addOns, so it always starts: it cannot be
//   turned off. Its first listeners are installed before this list.
// The other scripts don't depend on each other's order. In particular, the
// Welcome Screen and the rating prompt go through the wheel dialog module,
// which shows them in a fixed priority order, and Achievements are announced
// by non-blocking toasts, which wait for the Welcome Screen.
const SCRIPTS = [
    // Interface: translations, then the launch events trace (debugging,
    // LOG_LAUNCH_EVENTS), status line, menu cleanup, menus, filters,
    // Profile picker, clock, Status Icons, Wheel Arc, launch overlay.
    { key: "uiTranslation", module: uiTranslation },
    { key: "launchEventsTrace", module: launchEventsTrace },
    { key: "statusLineInfo", module: statusLineInfo },
    { key: "menuCleanup", module: menuCleanup },
    { key: "customMenuCommands", module: customMenuCommands },
    { key: "randomGame", module: randomGame },
    { key: "rocketGame", module: rocketGame },
    { key: "customFilter", module: customFilter },
    { key: "hallOfFame", module: hallOfFame },
    { key: "tablesToDiscover", module: tablesToDiscover },
    { key: "hiddenTables", module: hiddenTables },
    { key: "wheelOrder", module: wheelOrder },
    { key: "profilePicker", module: profilePicker },
    { key: "clock", module: clock },
    { key: "statusIcons", module: statusIcons },
    { key: "wheelArc", module: wheelArc },
    { key: "seamlessLaunchOverlay", module: seamlessLaunchOverlay },

    // Game session: windows, Backglass Clock, Discord Rich Presence, sound,
    // stats, Table ROMs, High Scores, achievements, Challenges, Table
    // Mastery, Profile Ratings, rating.
    { key: "forceBackglass", module: forceBackglass },
    { key: "backglassClock", module: backglassClock },
    { key: "discordRichPresence", module: discordRichPresence },
    { key: "playLaunchSound", module: playLaunchSound },
    { key: "sessionStatsTracker", module: sessionStatsTracker },
    { key: "tableRoms", module: tableRoms },
    { key: "highScores", module: highScores },
    { key: "achievements", module: achievementsEngine },
    { key: "challenges", module: challenges },
    { key: "tableMastery", module: tableMastery },
    { key: "profileRatings", module: profileRatings },
    { key: "ratingPrompt", module: ratingPrompt },

    // Welcome Screen, under the startup prompt's former key, which owners'
    // env.local overrides still use.
    { key: "startupChoicePrompt", module: welcomeScreen },

    // Drawn Menus, after everything that edits a menu.
    { key: "drawnMenus", module: drawnMenus },

    { key: "easterEggs", module: easterEggs },
];

const ENABLED_SCRIPTS = config.addOns;

// Before anything listens: the Rocket cancels a launch, and no other listener
// may hear its "prelaunch" and then wait for a "postlaunch" that never comes.
try {
    easterEggs.installFirstListeners();
} catch (error) {
    logError(SCRIPT_NAME, `ERROR installing the Easter Eggs' first listeners: ${error.message}`, null, error);
}

// Then, during the scripts' init: the view's size is read while PinballY
// has not laid its window out yet, so the startup dialogs wait for the change.
try {
    getWindowLayout();
} catch (error) {
    logError(SCRIPT_NAME, `ERROR reading the window's size at startup: ${error.message}`, null, error);
}

// Before any Add-on, and whatever Add-ons are on: the store records every
// play, and its "gameover" listener must run before the Add-ons' own.
let store = null;
try {
    store = getProfileStore();
} catch (error) {
    logError(SCRIPT_NAME, `ERROR loading the Profiles: ${error.message}`, null, error);
}

// As early as the Profile count allows, so it is the pack's first line in
// a pasted logfile.log.
try {
    writeStartupSummary(host, {
        language: config.language,
        addOns: ENABLED_SCRIPTS,
        // Guest included. Names only: listProfiles() would probe every Avatar.
        profileCount: store ? store.listProfileNames().length : null,
    });
} catch (error) {
    logError(SCRIPT_NAME, `ERROR writing the startup summary: ${error.message}`, null, error);
}

// Whatever Add-ons are on, a Child Profile never sees an Adult Table on the
// wheel. Before the switch to Guest below, which must refresh the wheel too.
if (store) {
    try {
        installChildWheelFilter();
    } catch (error) {
        logError(SCRIPT_NAME, `ERROR installing the Child Profile's wheel filter: ${error.message}`, null, error);
    }
}

// Without the picker nothing could switch away from the saved Profile, so
// Guest takes over. Done before any Add-on subscribes to onSwitch, so no
// greeting or toast follows; only the Child Profile's wheel filter hears it.
if (store && ENABLED_SCRIPTS.profilePicker === false) {
    try {
        const previousProfile = store.getActiveProfile();
        if (!previousProfile.isGuest) {
            store.switchTo(store.listProfiles().find(profile => profile.isGuest).name);
            host.log(`[${SCRIPT_NAME}] Profile picker disabled: switched from "${previousProfile.name}" to Guest.`);
        }
    } catch (error) {
        logError(SCRIPT_NAME, `ERROR switching to Guest: ${error.message}`, null, error);
    }
}

// Before any Add-on, so its fallbacks are logged once even with both its
// screens turned off.
if (store) {
    try {
        getStartupScreen();
    } catch (error) {
        logError(SCRIPT_NAME, `ERROR resolving the Startup Screen: ${error.message}`, null, error);
    }
}

// Before any Add-on, and whatever Add-ons are on: a table the last session
// left lowered gets its volume back before any screen can lower it again.
try {
    getQuietWheel().restoreLeftover();
} catch (error) {
    logError(SCRIPT_NAME, `ERROR restoring the quiet wheel's table: ${error.message}`, null, error);
}

// Whatever Add-ons are on: a Play that could not be saved is always told.
if (store) {
    try {
        startPlayErrorToasts();
    } catch (error) {
        logError(SCRIPT_NAME, `ERROR starting the Play Error Toasts: ${error.message}`, null, error);
    }
}

// Right before Drawn Menus, whatever config.addOns says: never an Add-on,
// their "menuopen" listener must still run before Drawn Menus' draws the
// Operator Menu, and after the translation's, which knows none of their texts.
function startSettings() {
    try {
        startExpansionPackSettings();
    } catch (error) {
        logError(SCRIPT_NAME, `ERROR starting the eXpansion Pack Settings: ${error.message}`, null, error);
    }
}

for (const { key, module } of SCRIPTS) {
    if (key === "drawnMenus") startSettings();
    if (ENABLED_SCRIPTS[key] === false) {
        if (LOG_STARTUP_TIMING) host.log(`[${SCRIPT_NAME}] "${key}" skipped (disabled in config).`);
        continue;
    }

    const startTime = Date.now();
    try {
        module.default();
    } catch (error) {
        logError(SCRIPT_NAME, `ERROR initializing "${key}": ${error.message}`, null, error);
        continue;
    }

    if (LOG_STARTUP_TIMING) {
        host.log(`[${SCRIPT_NAME}] "${key}" initialized in ${Date.now() - startTime} ms.`);
    }
}

// Last, whatever config.addOns says: never Add-ons. The Update result and
// Prompt read what an earlier start remembered, and the PinballY Version Notice
// what is installed, in the same tick as the Add-ons' own startup dialogs, which
// their priorities come before; then the Update Check's request runs in the
// background, so no startup screen waits for GitHub.
try {
    startUpdateResult();
} catch (error) {
    logError(SCRIPT_NAME, `ERROR submitting the Update result: ${error.message}`, null, error);
}
try {
    startUpdatePrompt();
} catch (error) {
    logError(SCRIPT_NAME, `ERROR submitting the Update Prompt: ${error.message}`, null, error);
}
try {
    startVersionNotice();
} catch (error) {
    logError(SCRIPT_NAME, `ERROR submitting the PinballY Version Notice: ${error.message}`, null, error);
}
try {
    startUpdateCheck();
} catch (error) {
    logError(SCRIPT_NAME, `ERROR starting the Update Check: ${error.message}`, null, error);
}