// ============================================================
// In-memory fake PinballY host for the node tests: the same interface as
// common/core/pinbally_host.js, plus controls to drive it (clock and timers,
// tables, wheel, menus, events, attract mode, games, file system, registry,
// programs, restarts, HTTP replies, PINemHi boards, a fake Discord) and inspect what the code did.
// Never loaded by PinballY.
// - Reproduces only behaviours written in docs/pinbally/ or an ADR.
// - installGlobals() also exposes it as PinballY's globals, for code not yet on the host.
// - settle() waits on a real timer for deferred work to run.
// ============================================================

import { projectFolderOf, mediaWindowOf, backglassRectOf, namedPipeOf, SWP_NOSIZE, SWP_NOMOVE } from "../../common/core/pinbally_host.js";
import { createFakeDiscord } from "./fake_discord.js";

// PinballY's HWND z-order constants (WindowObjects.html), as names a test reads.
const FAKE_HWND = Object.freeze({ TOP: "TOP", BOTTOM: "BOTTOM", TOPMOST: "TOPMOST", NOTOPMOST: "NOTOPMOST" });
// Where a new custom window opens, as seen on the cabinet (pinbally-help.md
// §2.1): on the playfield screen, at 26,26, 810x1375.
const NEW_MEDIA_WINDOW_RECT = Object.freeze({ left: 26, top: 26, right: 836, bottom: 1401 });
// A custom window's clientRect against its frame, as seen on the cabinet
// (§2.1, asked 320 wide, reported 480): another unit, the same ratio.
const MEDIA_WINDOW_CLIENT_SCALE = 1.5;
// §2.1: asked 320x128, a borderless custom window reports 320x200.
const BORDERLESS_MIN_HEIGHT = 200;

const RealDate = Date;
// The fake whose globals are installed and not yet uninstalled, if any.
let installedHost = null;
const realSetTimeout = setTimeout;
// PinballY kills a PINemHi run that lasts longer.
const PINEMHI_KILL_MS = 7500;
const realClearTimeout = clearTimeout;

// Lets the zero-delay timers (deferred checks, dialogs) run for real.
// Node delays them by 1 ms, as this wait, and runs timers of the same
// delay in order: every one set before settle() has run. A longer wait
// only slowed down the scenarios that settle hundreds of times.
export const settle = () => new Promise(resolve => realSetTimeout(resolve, 1));

// PinballY's own commands used by the add-ons; custom ones start above them.
const BUILT_IN_COMMANDS = {
    PlayGame: 1, ShowGameSetupMenu: 2, RateGame: 3, MenuReturn: 4, MenuPageUp: 5, MenuPageDown: 6, Quit: 7,
    ShowMainMenu: 8, ShowOperatorMenu: 9, PowerOff: 10, GameInfo: 11, Flyer: 12, HighScores: 13,
    Instructions: 14, AddFavorite: 15, Help: 16, AboutBox: 17,
    FilterByEra: 18, FilterByManufacturer: 19, FilterBySystem: 20, FilterByCategory: 21, FilterByRating: 22,
    FilterByRecency: 23, FilterByAdded: 24, RemoveFavorite: 25, ResumeGame: 26, KillGame: 27,
    Options: 28, BatchCaptureStep1: 29, ClearCredits: 30, EnableVideos: 31, MuteVideos: 32, CaptureGo: 33,
    // Every filter's command is in this range, PinballY's and the scripts' alike.
    FilterFirst: 900, FilterLast: 949,
};
const ALL_TABLES_FILTER_CMD = 900;
const FAVORITES_FILTER_CMD = 901;
// PinballY's own filters in a group, by id prefix (FilterInfo.html), and
// the group menu listing them.
const NATIVE_FILTER_GROUPS = [
    ["YearRange.", "FilterByEra"], ["Manuf.", "FilterByManufacturer"], ["System.", "FilterBySystem"],
    ["Category.", "FilterByCategory"], ["Uncategorized", "FilterByCategory"], ["Rating.", "FilterByRating"],
    ["PlayedWithin.", "FilterByRecency"], ["NotPlayedWithin.", "FilterByRecency"], ["NeverPlayed", "FilterByRecency"],
    ["AddedWithin.", "FilterByAdded"], ["AddedBefore.", "FilterByAdded"],
];
// The system groups a script filter can join, and their group menu.
const SYSTEM_GROUP_COMMANDS = {
    "[Era]": "FilterByEra", "[Manuf]": "FilterByManufacturer", "[Sys]": "FilterBySystem", "[Cat]": "FilterByCategory",
    "[Rating]": "FilterByRating", "[Played]": "FilterByRecency", "[!Played]": "FilterByRecency", "[!!Played]": "FilterByRecency",
    "[Added]": "FilterByAdded", "[!Added]": "FilterByAdded",
};
const nativeGroupOf = filterId => {
    const found = NATIVE_FILTER_GROUPS.find(([prefix]) => filterId.startsWith(prefix));
    return found ? found[1] : null;
};
const FIRST_CUSTOM_COMMAND = 1000;
// The pause menu of a running game, as PinballY 1.1.0 Beta 10 opens it
// (ADR 0013; prototype commit 6d07a1f): its items, Resume Game selected,
// and when the first of its two openings closes. Its separators are not
// recorded: left out.
const PAUSE_MENU_ID = "pause game";
const PAUSE_MENU_ITEMS = [
    ["Resume Game", "ResumeGame"], ["End Game", "KillGame"], ["Information", "GameInfo"], ["High Scores", "HighScores"],
    ["Flyer", "Flyer"], ["Instruction Card", "Instructions"], ["Exit PinballY", "Quit"], ["Shut Down", "PowerOff"],
    ["Cancel", "MenuReturn"],
];
const PAUSE_FIRST_CLOSE_MS = 150;
// The launch overlay's message for each "launchoverlaymessage" id: "init"
// and "after" carry none (LaunchOverlayEvent.html); the help names only
// "Loading Game" and "Game Exiting", the other texts are made up.
const OVERLAY_MESSAGES = {
    init: null, launching: "Loading Game", capturing: "Capturing", running: "Running",
    terminating: "Exiting Game", gameover: "Game Exiting", after: null,
};

const TRUE_STRINGS = ["1", "true", "yes", "on"];

// Rough text metrics for the fake StyledText: fixed-width characters and lines.
const CHAR_WIDTH = 7;
const LINE_HEIGHT = 20;

// PinballY stores every setting as a string and converts on read.
function toStoredString(value) {
    if (typeof value === "boolean") return value ? "1" : "0";
    return String(value);
}

// The user's temporary folder, as Scripting.FileSystemObject gives it.
const TEMPORARY_FOLDER = "C:\\Users\\Cabinet\\AppData\\Local\\Temp";
// What cmd.exe answers when the program to run does not exist.
const PROGRAM_NOT_FOUND_EXIT_CODE = 9009;
const DEFAULT_PROGRAM_MS = 100;
// PinballY's process id, as Kernel32's GetCurrentProcessId gives it.
export const FAKE_PINBALLY_PID = 4242;
// The restart helper writes its ready file 1.3 s after its start, as on
// the cabinet; PinballY gives up after 15 s (docs/adr/0017).
const RESTART_HELPER_READY_MS = 1300;
const RESTART_READY_TIMEOUT_MS = 15000;
// The Pack Update helper downloads and checks the zip first (made-up 5 s);
// PinballY gives up after 120 s.
const PACK_UPDATE_HELPER_READY_MS = 5000;
const PACK_UPDATE_READY_TIMEOUT_MS = 120000;
const PACK_UPDATE_HELPER_NAME = "pack_update.ps1";
// The Script Reader install helper downloads, checks and swaps in a made-up 3 s by default.
const SCRIPT_READER_INSTALL_MS = 3000;
const SCRIPT_READER_INSTALL_HELPER_NAME = "script_reader_install.ps1";
// The vpxtool a Script Reader install swaps in: it answers --version as the
// author's release build does, and reads a script that loads no ROM.
const installedVpxtool = version => args => ({ output: args[0] === "--version" ? `vpxtool git:v${version}\n` : "" });
// PinballY 1.1.0 Beta 10's systemInfo.version (the build number is made up).
export const BETA_10_VERSION = {
    basic: "1.1.0", build: 10086, buildDate: new RealDate(Date.UTC(2024, 8, 24)),
    display: "1.1.0 (Beta 10)", semantic: "1.1.0-beta.10+10086.20240924T1200", status: "1.1.0",
};

const withoutTrailingSlash = path => path.replace(/\\+$/, "");
const parentFolder = path => path.slice(0, path.lastIndexOf("\\"));

// Records its runs and gives a plausible measure; drawing it writes each
// run's text (without its line break) and colour to the drawing context,
// where the fake layer records it. Like PinballY, measuring it with no text logs a
// layout error and gives 0 by 0, and so does a style whose size or weight
// is given but isn't a usable number (an undefined weight included):
// DirectWrite's CreateTextFormat rejects it.
const LAYOUT_ERROR = "Error creating styled text layout (CreateTextFormat, HRESULT=80070057)";

const isInvalidTextStyle = style => Boolean(style) && (
    ("size" in style && !(Number.isFinite(style.size) && style.size > 0))
    || ("weight" in style && !(Number.isFinite(style.weight) && style.weight >= 1 && style.weight <= 999)));

// SystemClasses.js's CommandEvent, as PinballY fires it for a menu entry
// or a button.
class FakeCommandEvent {
    constructor(id) {
        this.type = "command";
        this.id = id;
        this.cancelable = true;
        this.defaultPrevented = false;
    }

    preventDefault() { this.defaultPrevented = true; }
}

class FakeStyledText {
    constructor(options = {}, log = () => {}) {
        this.options = options;
        this.runs = [];
        this.log = log;
        this.invalidStyle = isInvalidTextStyle(options.textStyle);
    }

    add(run) {
        if (typeof run !== "string" && isInvalidTextStyle(run)) this.invalidStyle = true;
        this.runs.push(typeof run === "string" ? { text: run } : run);
    }

    text() {
        return this.runs.map(run => run.text).join("");
    }

    measure(width) {
        if (this.runs.length === 0 || this.invalidStyle) {
            this.log(LAYOUT_ERROR);
            return { width: 0, height: 0 };
        }
        const lines = this.text().split("\n");
        const lineCount = lines.reduce(
            (count, line) => count + Math.max(1, Math.ceil(line.length * CHAR_WIDTH / width)), 0);
        const longest = Math.max(...lines.map(line => line.length));
        return { width: Math.min(width, longest * CHAR_WIDTH), height: lineCount * LINE_HEIGHT };
    }

    draw(dc, rect) {
        const baseColor = this.options.textStyle && this.options.textStyle.color;
        const baseSize = this.options.textStyle && this.options.textStyle.size;
        const baseWeight = this.options.textStyle && this.options.textStyle.weight;
        for (const run of this.runs) {
            dc.drawText(run.text.replace(/\n$/, ""), rect, run.color === undefined ? baseColor : run.color,
                run.size === undefined ? baseSize : run.size, run.weight === undefined ? baseWeight : run.weight, this.options.textAlign);
        }
    }
}

export function createFakePinballYHost({
    now = new RealDate(),
    tables = [],
    layoutSize = { width: 1920, height: 1080 },
    // The view's size during the scripts' init: PinballY gives its window its
    // final size only afterwards (845x461 then 2560x1600 on the cabinet, spec
    // #357). From the first tick, getViewSize() reports the layout size.
    viewSizeAtInit = { width: 0, height: 0 },
    programFolder = "C:\\PinballY\\",
    // systemInfo.version, in the formats of docs/pinbally/pinbally-help.md §2.10
    // (status holds the three-part version, not the release status).
    pinballYVersion = BETA_10_VERSION,
    // The player's own messages, from PinballY's status line options.
    upperStatusLineMessages = [],
    lowerStatusLineMessages = [],
    // The monitors Windows reports: a cabinet has one per screen.
    monitorCount = 2,
    // backglassWindow.hwndFrame's windowRect, the backglass screen on a
    // cabinet; null: a backglass window with no frame to read.
    backglassWindowRect = { left: 2560, top: 0, right: 4480, bottom: 1080 },
    // Each custom window's place restored from its configVarPrefix's
    // settings, where the owner left it: { [configVarPrefix]: windowRect }.
    savedMediaWindowRects = {},
    // How long each layer draw takes on the clock: a draw blocks PinballY
    // while it runs (docs/adr/0005); 0 leaves the clock still.
    drawMs = 0,
} = {}) {
    let nowMs = now.getTime();
    let currentDrawMs = drawMs;
    let currentLayoutSize = { ...layoutSize };
    // Set by the first timer that runs, zero-delay or not: the scripts' init is over.
    let isPastInit = false;
    // The view is as large as the layers' window once laid out.
    const viewSize = () => ({ ...(isPastInit ? currentLayoutSize : viewSizeAtInit) });
    const layers = [];
    // The backglass window's own layers, never listed with the playfield's.
    const backglassLayers = [];
    // Every layer draw, in order: { zIndex, texts, images }.
    const drawingList = [];
    // The underlay a script set, null until one does.
    let underlayFile = null;
    // The wheel's icons, hidden by showWheel(false).
    let wheelShown = true;
    // Every sound played, in order: { filePath, playerId }.
    const sounds = [];
    // Each Windows Media Player gets the next id when created.
    let nextSoundPlayerId = 1;
    // The single player behind playSound(), created on its first sound.
    let oneOffSoundPlayerId = null;
    // In-memory file system: folder paths, and file contents by path. The
    // program folder, its Scripts folder and the pack's folder exist, as in PinballY.
    const folders = new Set();
    const files = new Map();
    // The modified date of each file, in ms.
    const modifiedDates = new Map();
    // Files another program holds open: writing, renaming or deleting them throws.
    const lockedFiles = new Set();
    // Image files that exist but cannot be decoded (broken or half-written).
    const unreadableImages = new Set();
    // Files deleted by another program between a folder listing and their read.
    const vanishingFiles = new Set();
    // Every write, rename and delete, in order: { operation, path, to? }.
    const fileOperationList = [];
    // Every file read, in order, by path.
    const fileReadList = [];
    // How long each read of a file takes on the clock, by path: a read
    // blocks PinballY while it runs, as a draw does.
    const readMsByPath = new Map();
    function recordRead(path) {
        fileReadList.push(path);
        nowMs += readMsByPath.get(path) ?? 0;
    }
    addFolder(projectFolderOf(programFolder));
    addFolder(TEMPORARY_FOLDER);
    // What each program does when run, by path: args => { output, errorOutput, exitCode, durationMs }.
    const programs = new Map();
    // Every program run, in order: { program, args }.
    const programRunList = [];
    // Registry values by full path ("HKCU\\Software\\...\\name").
    const registryValues = new Map();
    // Restarts asked so far, and how many of the next ones never get ready.
    let restartCount = 0;
    let failingRestartCount = 0;
    let failingFolderCreationCount = 0;
    let failingCopyCount = 0;
    // Every Pack Update asked, in order: { zipUrl, sha256, packVersion },
    // and how many of the next ones never get ready.
    const packUpdateList = [];
    let failingPackUpdateCount = 0;
    // Every Script Reader install asked, in order: { zipUrl, sha256, version },
    // and how the next ones end: { exitCode, output, durationMs, hangs, vpxtool }.
    const scriptReaderInstallList = [];
    const scriptReaderInstallAnswers = [];
    // The replies to the next HTTP requests, in order: { status, statusText, text }.
    const httpReplies = [];
    // Every HTTP request sent, in order: { method, url, headers }.
    const httpRequestList = [];
    // Pending timers, run in due order by advanceTime(): { id, dueMs, callback, intervalMs }.
    let timers = [];
    let nextTimerId = 1;
    // A table's wheel logo is its "wheelImage" path, when that file exists,
    // and its game file its "gameFile" path. PinballY's methods are left out
    // of the table's own keys, so tests still compare tables with their
    // plain description.
    const wheelImageOf = game => (game.wheelImage && files.has(game.wheelImage) ? game.wheelImage : null);
    // Every GameInfo update(), in order: { configId, changes }.
    const gameUpdateList = [];
    // What PINemHi reads in each NVRAM, by board key (the table's ROM, or
    // its config ID without one): { lines, durationMs, fails, hangs }.
    const nvramBoards = new Map();
    // The board PinballY keeps after a read, by config ID, until a launch or setHighScores(null).
    const highScoreCache = new Map();
    // Every setHighScores() call, in order: { configId, lines } (null to forget).
    const highScoreSetList = [];
    const boardKeyOf = game => (game.rom ? `rom:${game.rom}` : `table:${game.configId}`);
    const withSource = (lines, source) => Object.assign([...lines], { source });
    // Like PinballY's getHighScores(): the cached board, or a PINemHi run
    // (after highscoresrequest, unless a listener cancels it) that fires
    // highscoresready and fails on a failed run or one killed after
    // PINEMHI_KILL_MS, or never answers (a run stuck behind another one).
    // The board is read as it is when the run starts.
    function getHighScoresOf(game) {
        if (highScoreCache.has(game.configId)) return Promise.resolve(withSource(highScoreCache.get(game.configId), "cache"));
        return new Promise((resolve, reject) => {
            const request = fire("highscoresrequest", { game });
            if (request.defaultPrevented) {
                if (highScoreCache.has(game.configId)) resolve(withSource(highScoreCache.get(game.configId), "javascript"));
                else reject(new Error("High scores request cancelled."));
                return;
            }
            const nvram = nvramBoards.get(boardKeyOf(game));
            const killed = Boolean(nvram) && nvram.durationMs > PINEMHI_KILL_MS;
            const lines = nvram ? [...nvram.lines] : [];
            if (nvram && nvram.hangs) return;
            addTimer(() => {
                if (!nvram || nvram.fails || killed) {
                    fire("highscoresready", { game, success: false, scores: [], source: "none" });
                    reject(new Error("PINemHi could not read the high scores."));
                    return;
                }
                highScoreCache.set(game.configId, lines);
                fire("highscoresready", { game, success: true, scores: [...lines], source: "pinemhi" });
                resolve(withSource(lines, "pinemhi"));
            }, nvram ? Math.min(nvram.durationMs, PINEMHI_KILL_MS) : 0);
        });
    }
    const withMedia = (table) => {
        const game = { ...table };
        return Object.defineProperties(game, {
            resolveMedia: {
                value: (type) => {
                    const found = type === "wheel image" ? wheelImageOf(table) : null;
                    return found ? [found] : [];
                },
            },
            resolveGameFile: {
                value: () => {
                    const path = table.gameFile || "";
                    const separator = path.lastIndexOf("\\");
                    return { exists: files.has(path), filename: path.slice(separator + 1), folder: path.slice(0, Math.max(separator, 0)), path };
                },
            },
            getHighScores: { value: () => getHighScoresOf(game) },
            // A board of lines replaces the cached one; null forgets it, so the next read runs PINemHi.
            setHighScores: {
                value: (lines) => {
                    highScoreSetList.push({ configId: game.configId, lines: lines === null ? null : [...lines] });
                    if (lines === null) highScoreCache.delete(game.configId);
                    else highScoreCache.set(game.configId, [...lines]);
                },
            },
            // Like PinballY: saves the changed fields, seen at once by every reader.
            update: {
                value: (changes) => {
                    gameUpdateList.push({ configId: game.configId, changes: { ...changes } });
                    Object.assign(game, changes);
                    return {};
                },
            },
        });
    };
    let allTables = tables.map(withMedia);
    // null = the wheel shows every visible table, in collection order.
    let wheelConfigIds = null;
    // Script filters by full id ("User.<id>"), and the id of the one shown.
    const filters = new Map();
    // Their commands, by full id.
    const filterCommands = new Map();
    let currentFilterId = "All";
    // Metafilters by id, and the tables they ruled out the last time a
    // filter ran: like PinballY, select() is not called again until then.
    const metaFilters = new Map();
    let nextMetaFilterId = 1;
    let ruledOutConfigIds = new Set();
    // The status lines' entries, as PinballY's getText() gives them.
    const upperStatusLine = upperStatusLineMessages.map(text => ({ text, isTemp: false }));
    const lowerStatusLine = lowerStatusLineMessages.map(text => ({ text, isTemp: false }));
    const storedSettings = new Map();
    const writtenKeys = new Set();
    const handlers = new Map();
    const commandIds = new Map();
    let nextCommandId = FIRST_CUSTOM_COMMAND;
    let nextFilterCommandId = FAVORITES_FILTER_CMD + 1;
    const shownMenuList = [];
    let shownMenu = null;
    let uiMode = "wheel";
    // "starting", "running" or "exiting" while a game is on, as in PinballY.
    let runMode;
    // "single" or "batch" while the running game is a media capture.
    let captureMode;
    const launchList = [];
    // The launch under way: its game, and how far the launch thread got
    // ("loading" from playGame, "opened" once "runbefore" fired, "started"
    // from "gamestarted"); and whether Exit Game was chosen during it.
    let launch = null;
    const logLines = [];
    const executedCommands = [];
    // What PinballY does itself for a command a test describes (opening a
    // filter submenu, applying a filter...), unless a listener prevented it.
    const nativeCommands = new Map();
    // Every showWindow() call on the backglass window, in order.
    const backglassShowCalls = [];
    // Every custom window created, in order, as mediaWindows() shows them.
    const mediaWindowList = [];
    // backglassWindow.hwndFrame, absent without a rect.
    const backglassFrame = backglassWindowRect ? { getWindowPos: () => ({ windowRect: { ...backglassWindowRect } }) } : undefined;

    function readSetting(key, defaultValue, convert) {
        return storedSettings.has(key) ? convert(storedSettings.get(key)) : defaultValue;
    }

    const settings = {
        getString: (key, defaultValue) => readSetting(key, defaultValue, text => text),
        getInt: (key, defaultValue) => readSetting(key, defaultValue, text => parseInt(text, 10)),
        getFloat: (key, defaultValue) => readSetting(key, defaultValue, text => parseFloat(text)),
        getBool: (key, defaultValue) =>
            readSetting(key, defaultValue, text => TRUE_STRINGS.includes(text.toLowerCase())),
        set: (key, value) => {
            storedSettings.set(key, toStoredString(value));
            writtenKeys.add(key);
        },
    };

    let heardThroughGlobals = false;
    const onThroughGlobals = (eventName, handler) => {
        heardThroughGlobals = true;
        on(eventName, handler);
    };

    // PinballY accepts "event.Namespace" names; only the event part matters here.
    function on(eventName, handler) {
        const type = eventName.split(".")[0];
        if (!handlers.has(type)) handlers.set(type, []);
        handlers.get(type).push(handler);
    }
    // Like PinballY's one(): the handler runs on the next event only.
    function one(eventName, handler) {
        let done = false;
        on(eventName, (ev) => {
            if (done) return;
            done = true;
            handler(ev);
        });
    }

    // As PinballY does, inserts a temporary entry just after the current one
    // (always the first here) and after the temporary ones already queued there.
    function showOnStatusLine(statusLine, text) {
        let index = 1;
        while (index < statusLine.length && statusLine[index].isTemp) index++;
        statusLine.splice(index, 0, { text, isTemp: true });
    }
    const showOnUpperStatusLine = text => showOnStatusLine(upperStatusLine, text);
    const showOnLowerStatusLine = text => showOnStatusLine(lowerStatusLine, text);

    // PinballY's statusLines.upper / .lower object for one line.
    function statusLineObject(statusLine) {
        return {
            getText: () => statusLine.map(entry => ({ ...entry })),
            add: (text) => { statusLine.push({ text, isTemp: false }); },
            setText: (index, text) => { statusLine[index].text = text; },
            show: text => showOnStatusLine(statusLine, text),
        };
    }

    function fire(type, properties = {}) {
        const ev = {
            type,
            defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
        };
        // Copies accessors as accessors, so a menu's items stay live.
        Object.defineProperties(ev, Object.getOwnPropertyDescriptors(properties));
        for (const handler of [...(handlers.get(type) || [])]) handler(ev);
        return ev;
    }

    function setUnderlay(filePath) { underlayFile = filePath; }

    // As PinballY searches a global image: the media folder, then the Assets folder.
    function resolveGlobalImage(subfolder, baseName) {
        const program = withoutTrailingSlash(programFolder);
        for (const folder of [`${program}\\Media\\${subfolder}`, `${program}\\Assets\\${subfolder}`]) {
            for (const extension of ["png", "jpg", "jpeg"]) {
                const path = `${folder}\\${baseName}.${extension}`;
                if (files.has(path)) return path;
            }
        }
        return undefined;
    }

    function returnToWheel() {
        uiMode = "wheel";
        runMode = undefined;
        captureMode = undefined;
        fire("wheelmode");
    }

    // The launch events, in the order of docs/pinbally/pinbally-help.md
    // ("Interleaved launch order"), as confirmed on the cabinet.
    const launchPropertiesOf = game => ({ game, command: launch ? launch.command : BUILT_IN_COMMANDS.PlayGame });
    function showOverlayMessage(id) {
        fire("launchoverlaymessage", { id, message: OVERLAY_MESSAGES[id], hideWheelImage: false });
    }
    // The launch thread's first steps, which every later step follows.
    function openLaunch() {
        if (!launch || launch.stage !== "loading") return;
        launch.stage = "opened";
        fire("runbeforepre", launchPropertiesOf(launch.game));
        showOverlayMessage("launching");
        fire("runbefore", launchPropertiesOf(launch.game));
    }
    // From the game's exit to the overlay's hide; "postlaunch" is the caller's.
    function closeLaunch(game) {
        openLaunch();
        runMode = "exiting";
        if (!(launch && launch.exitChosen)) showOverlayMessage("gameover");
        fire("gameover", launchPropertiesOf(game));
        fire("runafter", launchPropertiesOf(game));
        showOverlayMessage("after");
        fire("runafterpost", launchPropertiesOf(game));
        fire("launchoverlayhide", { game });
        launch = null;
    }

    function getFullUIMode() {
        const mode = { mode: uiMode };
        if (shownMenu) mode.menuID = shownMenu.id;
        if (runMode) mode.runMode = runMode;
        if (captureMode) mode.capture = captureMode;
        return mode;
    }

    function addTimer(callback, ms, intervalMs) {
        // A zero interval would never let advanceTime() reach its target.
        if (intervalMs !== undefined && !(intervalMs > 0)) {
            throw new Error(`The fake host needs a positive interval, not ${intervalMs} ms.`);
        }
        const id = nextTimerId++;
        timers.push({ id, dueMs: nowMs + ms, callback, intervalMs });
        return id;
    }

    function removeTimer(id) {
        timers = timers.filter(timer => timer.id !== id);
    }

    // Moves the clock forward, running every timer that falls due on the way
    // at its own due time, earliest first (creation order on a tie). A
    // callback that takes time (a slow draw) moves the clock on itself, and
    // the timers due meanwhile then run late, as in PinballY.
    function advanceTime(ms) {
        isPastInit = true;
        const targetMs = nowMs + ms;
        for (;;) {
            const due = timers
                .filter(timer => timer.dueMs <= targetMs)
                .sort((a, b) => a.dueMs - b.dueMs || a.id - b.id)[0];
            if (!due) break;
            nowMs = Math.max(nowMs, due.dueMs);
            if (due.intervalMs === undefined) removeTimer(due.id);
            else due.dueMs = Math.max(due.dueMs + due.intervalMs, nowMs);
            due.callback();
        }
        nowMs = Math.max(nowMs, targetMs);
    }

    // A drawing layer that keeps only what the tests look at: the texts,
    // image paths, frames (frameRect) and fill colours (fillRect) drawn
    // since the last draw or clear, the fills, texts and images in their
    // drawing order, the canvas size of the last draw, the image file it
    // shows (loadImage), the colour it was cleared to, its position, scale and
    // alpha. Like PinballY, a draw without a size gets a canvas the size of
    // the window, and a draw, a clear or a loaded image replaces whatever
    // the layer showed.
    function createLayerObject(zIndex) {
        let texts = [];
        let images = [];
        let frames = [];
        // Fills, texts and images in drawing order: five numbers per fill
        // (x, y, width, height, colour), a text's { text, rect } and an
        // image's { image, rect } in one flat array, as films drawn ahead make millions of fills.
        let strokes = [];
        let canvasSize = null;
        let loadedImage = null;
        let clearColor = null;
        let position = { x: 0, y: 0 };
        // PinballY's default: stretched to the whole window.
        let scale = { xSpan: 1, ySpan: 1 };
        const dc = {
            getSize: () => ({ ...canvasSize }),
            fillRect: (x, y, width, height, color) => { strokes.push(x, y, width, height, color); },
            frameRect: (x, y, width, height) => { frames.push({ x, y, width, height }); },
            drawImage: (path, x, y, width, height) => {
                images.push(path);
                strokes.push({ image: path, rect: { x, y, width, height } });
            },
            // Like PinballY: throws on a missing or unreadable image.
            getImageSize: (path) => {
                if (!isImageReadable(path)) throw new Error(`Cannot load image: ${path}`);
                return { width: 256, height: 256 };
            },
            // size: the StyledText's, in points as PinballY takes it; weight: its run's;
            // align: the StyledText's textAlign.
            drawText: (text, rect, color, size, weight, align) => {
                texts.push(text);
                strokes.push({ text, rect: rect && { ...rect }, color, size, weight, align });
            },
        };
        // A draw, a clear or a loaded image starts from an empty layer.
        function replaceContent() {
            texts = [];
            images = [];
            frames = [];
            strokes = [];
            loadedImage = null;
            clearColor = null;
        }
        const layer = {
            zIndex,
            alpha: 1,
            draw(drawFunction, width, height) {
                replaceContent();
                canvasSize = width === undefined ? { ...currentLayoutSize } : { width, height };
                drawFunction(dc);
                nowMs += currentDrawMs;
                drawingList.push({ zIndex, texts: [...texts], images: [...images] });
            },
            clear(color) {
                replaceContent();
                clearColor = color === undefined ? null : color;
            },
            // A fully qualified path, as the DrawingLayer help asks.
            loadImage(path) {
                replaceContent();
                loadedImage = path;
            },
            setPos(x, y, align) { position = align === undefined ? { x, y } : { x, y, align }; },
            setScale(options) { scale = { ...options }; },
            texts: () => [...texts],
            images: () => [...images],
            frames: () => frames.map(frame => ({ ...frame })),
            fills: () => readStrokes(strokes).filter(stroke => "fill" in stroke).map(stroke => stroke.fill),
            // Fills ({ fill: color, rect }), texts ({ text, rect, color }) and images
            // ({ image: path, rect }) in drawing order.
            strokes: () => readStrokes(strokes),
            canvasSize: () => ({ ...canvasSize }),
            loadedImage: () => loadedImage,
            clearColor: () => clearColor,
            position: () => ({ ...position }),
            scale: () => ({ ...scale }),
        };
        return layer;
    }

    function createDrawingLayer(zIndex) {
        const layer = createLayerObject(zIndex);
        layers.push(layer);
        return layer;
    }

    // A custom window as mainWindow.createMediaWindow() returns it: opened
    // where its settings put it, else where the cabinet showed a new one,
    // visible, with a title bar until borderlessMode is set. setWindowPos moves and sizes it unless its
    // flags say not to, borderless never less than 200 px tall (seen on the
    // cabinet, docs/pinbally/pinbally-help.md §2.1); its client size is the frame's, in other units.
    // Shown during a game, it activates PinballY, which opens the pause menu
    // (seen on the cabinet, docs/pinbally/pinbally-help.md, #386).
    // Each showWindow and setWindowPos call is recorded in order.
    function createRawMediaWindow(desc) {
        let rect = { ...(savedMediaWindowRects[desc.configVarPrefix] ?? NEW_MEDIA_WINDOW_RECT) };
        let visible = true;
        const calls = [];
        const ownLayers = [];
        const rawWindow = {
            borderlessMode: false,
            showMediaWhenRunningFlag: undefined,
            showWindow: (shown) => {
                calls.push({ call: "showWindow", visible: shown });
                visible = shown;
                if (shown && runMode) host.openPauseMenu();
            },
            setWindowPos: (after, x, y, width, height, flags) => {
                calls.push({ call: "setWindowPos", after, x, y, width, height, flags });
                const size = (flags & SWP_NOSIZE) ? { width: rect.right - rect.left, height: rect.bottom - rect.top }
                    : { width, height: rawWindow.borderlessMode ? Math.max(height, BORDERLESS_MIN_HEIGHT) : height };
                const origin = (flags & SWP_NOMOVE) ? { left: rect.left, top: rect.top } : { left: x, top: y };
                rect = { ...origin, right: origin.left + size.width, bottom: origin.top + size.height };
            },
            hwndFrame: { getWindowPos: () => ({ windowRect: { ...rect } }) },
            hwndView: {
                getWindowPos: () => ({
                    clientRect: {
                        left: 0, top: 0,
                        right: (rect.right - rect.left) * MEDIA_WINDOW_CLIENT_SCALE, bottom: (rect.bottom - rect.top) * MEDIA_WINDOW_CLIENT_SCALE,
                    },
                }),
            },
            createDrawingLayer: (zIndex) => {
                const layer = createLayerObject(zIndex);
                ownLayers.push(layer);
                return layer;
            },
        };
        mediaWindowList.push({
            desc: { ...desc },
            borderlessMode: () => rawWindow.borderlessMode,
            showMediaWhenRunningFlag: () => rawWindow.showMediaWhenRunningFlag,
            isVisible: () => visible,
            calls: () => calls.map(entry => ({ ...entry })),
            windowRect: () => ({ ...rect }),
            layers: () => [...ownLayers],
            // The owner resizing it by hand: PinballY tells no script.
            resize({ width, height }) { rect = { ...rect, right: rect.left + width, bottom: rect.top + height }; },
            // The owner dragging it with the mouse: the place moved and stuck (§2.1).
            dragTo(place) { rect = { ...place }; },
            // The owner showing its borders from its right-click menu (UsageTips.html).
            showBorders() { rawWindow.borderlessMode = false; },
        });
        return rawWindow;
    }

    // PinballY's launch overlay: its background and foreground layers,
    // drawn above every drawing layer, never listed with them (no z-index).
    const launchOverlay = { bg: createLayerObject(null), fg: createLayerObject(null) };
    function showWheel(visible) { wheelShown = visible; }

    function readStrokes(data) {
        const strokes = [];
        for (let index = 0; index < data.length;) {
            if (typeof data[index] === "object") {
                strokes.push({ ...data[index] });
                index++;
            } else {
                const [x, y, width, height, fill] = data.slice(index, index + 5);
                strokes.push({ fill, rect: { x, y, width, height } });
                index += 5;
            }
        }
        return strokes;
    }

    function removeDrawingLayer(layer) {
        const index = layers.indexOf(layer);
        if (index >= 0) layers.splice(index, 1);
    }

    // Every window has its own layers (docs/pinbally/pinbally-help.md §2.1).
    // Whether a layer posed while the window is hidden shows when it returns
    // is not documented: the layers are listed whatever the window's state.
    function createBackglassDrawingLayer(zIndex) {
        const layer = createLayerObject(zIndex);
        backglassLayers.push(layer);
        return layer;
    }

    function removeBackglassDrawingLayer(layer) {
        const index = backglassLayers.indexOf(layer);
        if (index >= 0) backglassLayers.splice(index, 1);
    }

    const isImageReadable = path => files.has(path) && !unreadableImages.has(path);

    // Like the production host: a file never added by addFile() is missing,
    // and a single player plays every sound.
    function requireSoundFile(filePath) {
        if (!files.has(filePath)) throw new Error(`Sound file not found: ${filePath}`);
    }

    function playSound(filePath) {
        requireSoundFile(filePath);
        if (oneOffSoundPlayerId === null) oneOffSoundPlayerId = nextSoundPlayerId++;
        sounds.push({ filePath, playerId: oneOffSoundPlayerId });
    }

    function createSoundRotation(filePath, playerCount) {
        requireSoundFile(filePath);
        const playerIds = Array.from({ length: playerCount }, () => nextSoundPlayerId++);
        let next = 0;
        return {
            play() {
                sounds.push({ filePath, playerId: playerIds[next] });
                next = (next + 1) % playerIds.length;
            },
        };
    }

    // A Windows Media Player COM object: it plays its URL when set with
    // autoStart on, or on controls.play(); a missing file plays nothing,
    // without an error, as in Windows.
    function createComMediaPlayer() {
        const playerId = nextSoundPlayerId++;
        let url = "";
        const playUrl = () => {
            if (files.has(url)) sounds.push({ filePath: url, playerId });
        };
        const player = {
            settings: { autoStart: true },
            get URL() { return url; },
            set URL(filePath) {
                url = filePath;
                if (player.settings.autoStart) playUrl();
            },
            controls: { currentPosition: 0, play: playUrl },
        };
        return player;
    }

    // Creates the folder and every missing parent folder.
    function addFolder(folderPath) {
        for (let path = withoutTrailingSlash(folderPath); path.includes("\\"); path = parentFolder(path)) {
            folders.add(path);
        }
    }

    function requireParentFolder(path) {
        if (!folders.has(parentFolder(path))) throw new Error(`Folder not found: ${parentFolder(path)}`);
    }

    function requireFile(path) {
        if (!files.has(path)) throw new Error(`File not found: ${path}`);
    }

    function requireUnlocked(path) {
        if (lockedFiles.has(path)) throw new Error(`Permission denied: ${path}`);
    }

    // Same rules as Scripting.FileSystemObject and ADODB.Stream: writing
    // needs the folder, renaming never overwrites, a missing file throws.
    const fileSystem = {
        listFolders(folderPath) {
            const parent = withoutTrailingSlash(folderPath);
            return [...folders].filter(path => parentFolder(path) === parent).map(path => path.slice(parent.length + 1));
        },
        listFiles(folderPath) {
            const parent = withoutTrailingSlash(folderPath);
            return [...files.keys()].filter(path => parentFolder(path) === parent).map(path => path.slice(parent.length + 1));
        },
        fileExists: (path) => files.has(path),
        folderExists: (path) => folders.has(withoutTrailingSlash(path)),
        readText(path) {
            requireFile(path);
            recordRead(path);
            return files.get(path);
        },
        // A file seeded with bytes (a Uint8Array), as a copy; a text file as its UTF-8 bytes.
        readBytes(path) {
            if (vanishingFiles.delete(path)) {
                files.delete(path);
                modifiedDates.delete(path);
            }
            requireFile(path);
            recordRead(path);
            const content = files.get(path);
            return content instanceof Uint8Array ? new Uint8Array(content) : new Uint8Array(Buffer.from(content, "utf8"));
        },
        writeText(path, text) {
            requireParentFolder(path);
            requireUnlocked(path);
            files.set(path, text);
            modifiedDates.set(path, nowMs);
            fileOperationList.push({ operation: "write", path });
        },
        // Creates a missing file, as writeText does.
        appendText(path, text) {
            requireParentFolder(path);
            requireUnlocked(path);
            files.set(path, (files.get(path) ?? "") + text);
            modifiedDates.set(path, nowMs);
            fileOperationList.push({ operation: "append", path });
        },
        renameFile(fromPath, toPath) {
            requireFile(fromPath);
            requireUnlocked(fromPath);
            requireParentFolder(toPath);
            if (files.has(toPath)) throw new Error(`File already exists: ${toPath}`);
            files.set(toPath, files.get(fromPath));
            modifiedDates.set(toPath, modifiedDates.get(fromPath));
            files.delete(fromPath);
            modifiedDates.delete(fromPath);
            fileOperationList.push({ operation: "rename", path: fromPath, to: toPath });
        },
        deleteFile(path) {
            requireFile(path);
            requireUnlocked(path);
            files.delete(path);
            modifiedDates.delete(path);
            fileOperationList.push({ operation: "delete", path });
        },
        // Overwrites the target, as CopyFile with its overwrite flag does.
        copyFile(fromPath, toPath) {
            if (failingCopyCount > 0) {
                failingCopyCount--;
                throw new Error(`Permission denied: ${toPath}`);
            }
            requireFile(fromPath);
            requireParentFolder(toPath);
            requireUnlocked(toPath);
            const content = files.get(fromPath);
            files.set(toPath, content instanceof Uint8Array ? new Uint8Array(content) : content);
            modifiedDates.set(toPath, nowMs);
            if (unreadableImages.has(fromPath)) unreadableImages.add(toPath);
            else unreadableImages.delete(toPath);
            fileOperationList.push({ operation: "copy", path: fromPath, to: toPath });
        },
        createFolder(folderPath) {
            if (failingFolderCreationCount > 0) {
                failingFolderCreationCount--;
                throw new Error(`Permission denied: ${folderPath}`);
            }
            requireParentFolder(withoutTrailingSlash(folderPath));
            folders.add(withoutTrailingSlash(folderPath));
        },
        // Each file of the folder with its modified date and size; null when
        // the folder doesn't exist.
        listFileInfos(folderPath) {
            if (!folders.has(withoutTrailingSlash(folderPath))) return null;
            return fileSystem.listFiles(folderPath).map(name => ({ name, ...fileSystem.getFileInfo(`${withoutTrailingSlash(folderPath)}\\${name}`) }));
        },
        isImageReadable,
        // The size counts the UTF-8 bytes of the file's text.
        getFileInfo: (path) => (files.has(path)
            ? { modified: modifiedDates.get(path), size: Buffer.byteLength(files.get(path), "utf8") }
            : null),
    };

    // Kernel32's file reads: CreateFileW opens an existing file for reading
    // only, shared with readers and writers (the only open the pack makes);
    // a missing file gives INVALID_HANDLE_VALUE. Each handle stays open
    // until CloseHandle, and openFileHandleCount() tells how many are.
    const openFileHandles = new Map();
    let nextFileHandle = 1;
    const INVALID_HANDLE = { toString: () => "FFFFFFFFFFFFFFFF" };
    const GENERIC_READ = 0x80000000;
    const FILE_SHARE_READ_WRITE = 3;
    const OPEN_EXISTING = 3;
    const openFileOf = (handle) => {
        if (!openFileHandles.has(handle)) throw new Error("Not an open file handle.");
        return openFileHandles.get(handle);
    };
    // Discord's IPC pipes (docs/adr/0022): the fake Discord on each pipe
    // name, every pipe open tried, and each open pipe handle's Discord.
    // A pipe opens only for reading and writing, unshared, synchronous.
    const PIPE_PREFIX = "\\\\?\\pipe\\";
    const GENERIC_READ_WRITE = (0x80000000 | 0x40000000) >>> 0;
    const discordPipes = new Map();
    const pipeOpenList = [];
    const openPipeHandles = new Map();
    function openPipe(path, access, share, disposition, flags) {
        if (access !== GENERIC_READ_WRITE || share !== 0 || disposition !== OPEN_EXISTING || flags !== 0) {
            throw new Error(`The fake host opens pipes for a synchronous read and write only: ${path}`);
        }
        pipeOpenList.push(path);
        const discord = discordPipes.get(path);
        if (!discord || !discord.connect()) return INVALID_HANDLE;
        const id = nextFileHandle++;
        const handle = { toString: () => id.toString(16) };
        openPipeHandles.set(handle, discord);
        return handle;
    }
    const kernel32 = {
        CreateFileW(path, access, share, security, disposition, flags) {
            if (path.startsWith(PIPE_PREFIX)) return openPipe(path, access, share, disposition, flags);
            if (access !== GENERIC_READ || share !== FILE_SHARE_READ_WRITE || disposition !== OPEN_EXISTING) {
                throw new Error(`The fake host opens files for a shared read only: ${path}`);
            }
            if (!files.has(path)) return INVALID_HANDLE;
            const id = nextFileHandle++;
            const handle = { toString: () => id.toString(16) };
            // Recorded as a read of the file.
            openFileHandles.set(handle, fileSystem.readBytes(path));
            return handle;
        },
        GetFileSizeEx(handle, size) {
            size.value = openFileOf(handle).length;
            return 1;
        },
        ReadFile(handle, buffer, count, readCount) {
            const bytes = openPipeHandles.has(handle) ? openPipeHandles.get(handle).read(count) : openFileOf(handle).subarray(0, count);
            if (!bytes) return 0;
            buffer.set(bytes);
            readCount.value = bytes.length;
            return 1;
        },
        PeekNamedPipe(handle, buffer, bufferSize, bytesRead, totalBytesAvailable) {
            if (!openPipeHandles.has(handle)) throw new Error("Not an open pipe handle.");
            const waiting = openPipeHandles.get(handle).bytesWaiting();
            if (waiting === null) return 0;
            totalBytesAvailable.value = waiting;
            return 1;
        },
        WriteFile(handle, buffer, count, writtenCount) {
            if (!openPipeHandles.has(handle)) throw new Error("The fake host writes to pipes only.");
            if (!openPipeHandles.get(handle).write(buffer.subarray(0, count))) return 0;
            writtenCount.value = count;
            return 1;
        },
        CloseHandle(handle) {
            if (openPipeHandles.has(handle)) {
                openPipeHandles.get(handle).disconnect();
                openPipeHandles.delete(handle);
                return 1;
            }
            openFileOf(handle);
            openFileHandles.delete(handle);
            return 1;
        },
        GetCurrentProcessId: () => FAKE_PINBALLY_PID,
    };

    // Starts the program as the test described it; onEnd({ exitCode, output })
    // runs once its run time has passed on the manual clock. Its standard
    // error is never part of the output.
    function startProgram(program, args, onEnd) {
        programRunList.push({ program, args: [...args] });
        const describe = programs.get(program);
        const { output = "", exitCode = 0, durationMs = DEFAULT_PROGRAM_MS } = files.has(program) && describe
            ? describe(args)
            : { exitCode: PROGRAM_NOT_FOUND_EXIT_CODE, durationMs: 0 };
        addTimer(() => onEnd({ exitCode, output }), durationMs);
    }

    function runHiddenProgram(program, args) {
        let result = null;
        startProgram(program, args, (ended) => { result = ended; });
        return { result: () => result };
    }

    // Starts "cmd.exe /d /c" as the production host does, given
    // "<wrapper>" "<output file>" "<exit code file>" "<program>" "<args>"...
    // The wrapper's files are written when the program ends.
    function runWrapper(parameters) {
        const inner = /^\/d \/c "(.*)"$/.exec(parameters);
        if (!inner) throw new Error(`The fake host cannot run: cmd.exe ${parameters}`);
        const [wrapper, outputPath, codePath, program, ...args] = [...inner[1].matchAll(/"([^"]*)"/g)].map(match => match[1]);
        requireFile(wrapper);
        startProgram(program, args, ({ exitCode, output }) => {
            fileSystem.writeText(outputPath, output);
            fileSystem.writeText(codePath, `${exitCode}\r\n`);
        });
    }

    // Counts a restart asked; false when it was made to fail.
    function askRestart() {
        restartCount++;
        if (failingRestartCount === 0) return true;
        failingRestartCount--;
        return false;
    }

    // Records a Pack Update asked; false when it was made to fail.
    function askPackUpdate({ zipUrl, sha256, packVersion }) {
        packUpdateList.push({ zipUrl, sha256, packVersion });
        if (failingPackUpdateCount === 0) return true;
        failingPackUpdateCount--;
        return false;
    }

    // Records a Script Reader install asked; onEnd({ exitCode, output }) runs
    // once it ends as the test chose, after vpxtool.exe was swapped into
    // toolsFolder on success; never for one that hangs.
    function installScriptReaderInto(toolsFolder, { zipUrl, sha256, version }, onEnd) {
        scriptReaderInstallList.push({ zipUrl, sha256, version });
        const {
            exitCode = 0, output = `vpxtool git:v${version}\r\n`, durationMs = SCRIPT_READER_INSTALL_MS, hangs = false, vpxtool = installedVpxtool(version),
        } = scriptReaderInstallAnswers.shift() || {};
        if (hangs) return;
        addTimer(() => {
            if (exitCode === 0) host.addProgram(`${toolsFolder}\\vpxtool.exe`, vpxtool);
            onEnd({ exitCode, output });
        }, durationMs);
    }

    // The restart, Pack Update or Script Reader install helper as the
    // production host starts it, recorded as a run of powershell.exe with its
    // arguments, never run: it writes its ready file once ready, unless made
    // to fail or missing; the install writes its output and exit code files.
    function startHelper(parameters) {
        const args = [...parameters.matchAll(/"([^"]*)"|(\S+)/g)].map(match => match[1] ?? match[2]);
        programRunList.push({ program: "powershell.exe", args });
        const valueOf = name => args[args.indexOf(name) + 1];
        if (valueOf("-File").endsWith(`\\${SCRIPT_READER_INSTALL_HELPER_NAME}`)) {
            if (!files.has(valueOf("-File"))) return;
            installScriptReaderInto(valueOf("-ToolsFolder"), { zipUrl: valueOf("-ZipUrl"), sha256: valueOf("-Sha256"), version: valueOf("-Version") }, ({ exitCode, output }) => {
                fileSystem.writeText(valueOf("-OutputFile"), output);
                fileSystem.writeText(valueOf("-CodeFile"), `${exitCode}\r\n`);
            });
            return;
        }
        const isPackUpdate = valueOf("-File").endsWith(`\\${PACK_UPDATE_HELPER_NAME}`);
        const isAsked = isPackUpdate
            ? askPackUpdate({ zipUrl: valueOf("-ZipUrl"), sha256: valueOf("-Sha256"), packVersion: valueOf("-PackVersion") })
            : askRestart();
        if (!isAsked || !files.has(valueOf("-File"))) return;
        addTimer(() => fileSystem.writeText(valueOf("-ReadyFile"), String(FAKE_PINBALLY_PID + 1)),
            isPackUpdate ? PACK_UPDATE_HELPER_READY_MS : RESTART_HELPER_READY_MS);
    }

    // Shell32's ShellExecuteW: only "open" on cmd.exe or powershell.exe,
    // hidden (SW_HIDE). Like the native one, it returns a handle whose
    // number is above 32 on success.
    function shellExecute(hwnd, operation, file, parameters, directory, showCommand) {
        if (operation !== "open" || !["cmd.exe", "powershell.exe"].includes(file) || showCommand !== 0) {
            throw new Error(`The fake host runs cmd.exe or powershell.exe hidden only: ${operation} ${file} ${parameters} (show ${showCommand})`);
        }
        if (file === "powershell.exe") startHelper(parameters);
        else runWrapper(parameters);
        return { toNumber: () => 42 };
    }

    // Like the production host, without a helper: Quit once it would be
    // ready, or onFailed after 15 s for a restart made to fail.
    function restartPinballY({ onQuitting, onFailed }) {
        if (!askRestart()) {
            addTimer(() => onFailed(new Error("The restart helper was not ready after 15 s.")), RESTART_READY_TIMEOUT_MS);
            return;
        }
        addTimer(() => {
            onQuitting();
            host.doCommand(BUILT_IN_COMMANDS.Quit);
        }, RESTART_HELPER_READY_MS);
    }

    // Like the production host, without a helper: Quit once it would be
    // ready, or onFailed after 120 s for a Pack Update made to fail.
    function startPackUpdate({ zipUrl, sha256, packVersion, onQuitting, onFailed }) {
        if (!askPackUpdate({ zipUrl, sha256, packVersion })) {
            addTimer(() => onFailed(new Error("The Pack Update helper was not ready after 120 s.")), PACK_UPDATE_READY_TIMEOUT_MS);
            return;
        }
        addTimer(() => {
            onQuitting();
            host.doCommand(BUILT_IN_COMMANDS.Quit);
        }, PACK_UPDATE_HELPER_READY_MS);
    }

    // Like the production host, without a helper.
    function installScriptReader(release) {
        let result = null;
        installScriptReaderInto(`${projectFolderOf(programFolder)}\\tools`, release, (ended) => { result = ended; });
        return { result: () => result };
    }

    // Like PinballY's HttpRequest.send() (docs/pinbally/pinbally-help.md:
    // it rejects every status other than 200): the reply text on status
    // 200, else a rejection with new Error(statusText). A request with no reply queued never answers,
    // like a slow network.
    function sendHttp(method, url, headers) {
        httpRequestList.push({ method, url, headers: { ...headers } });
        if (httpReplies.length === 0) return new Promise(() => {});
        const { status = 200, statusText = "OK", text = "" } = httpReplies.shift();
        return status === 200 ? Promise.resolve(text) : Promise.reject(new Error(statusText));
    }

    // SystemClasses.js's HttpRequest, asynchronous only: a synchronous
    // open() freezes PinballY (HttpRequest.html).
    class FakeHttpRequest {
        constructor() {
            this.target = null;
            this.headers = {};
        }

        open(method, url, async) {
            if (async !== true) throw new Error(`The fake host sends asynchronous requests only: ${method} ${url}`);
            this.target = { method, url };
        }

        setRequestHeader(name, value) { this.headers[name] = value; }

        send() { return sendHttp(this.target.method, this.target.url, this.headers); }
    }

    // WScript.Shell as PinballY's COM bridge offers it on the cabinet: no
    // Run (calling it throws "Object doesn't support property or method").
    function createComShell() {
        return {
            // Like WScript.Shell: a missing value throws.
            RegRead(path) {
                if (!registryValues.has(path)) throw new Error(`Invalid root in registry key "${path}".`);
                return registryValues.get(path);
            },
        };
    }

    // Scripting.FileSystemObject over the in-memory file system, for code
    // that uses the COM object directly (the production host, config.js).
    function createComFileSystem() {
        return {
            FileExists: fileSystem.fileExists,
            FolderExists: (path) => folders.has(withoutTrailingSlash(path)),
            GetFolder: (path) => {
                if (!folders.has(withoutTrailingSlash(path))) throw new Error(`Folder not found: ${path}`);
                return {
                    SubFolders: fileSystem.listFolders(path).map(name => ({ Name: name })),
                    Files: fileSystem.listFiles(path).map((name) => {
                        const { modified, size } = fileSystem.getFileInfo(`${withoutTrailingSlash(path)}\\${name}`);
                        return { Name: name, DateLastModified: new RealDate(modified), Size: size };
                    }),
                };
            },
            CreateFolder: (path) => {
                if (folders.has(withoutTrailingSlash(path))) throw new Error(`Folder already exists: ${path}`);
                fileSystem.createFolder(path);
            },
            MoveFile: fileSystem.renameFile,
            DeleteFile: fileSystem.deleteFile,
            // Only with its overwrite flag, the one the pack passes.
            CopyFile: (fromPath, toPath, overwrite) => {
                if (overwrite !== true) throw new Error("The fake host copies only with overwrite.");
                fileSystem.copyFile(fromPath, toPath);
            },
            GetFile: (path) => {
                requireFile(path);
                const { modified, size } = fileSystem.getFileInfo(path);
                return { DateLastModified: new RealDate(modified), Size: size };
            },
            GetSpecialFolder: (folderId) => {
                if (folderId !== 2) throw new Error(`The fake host has no special folder ${folderId}.`);
                return { Path: TEMPORARY_FOLDER };
            },
            // An ANSI text file, written on Close().
            CreateTextFile: (path) => {
                let text = "";
                return {
                    Write(newText) { text += newText; },
                    Close() { fileSystem.writeText(path, text); },
                };
            },
        };
    }

    // ADODB.Stream in text mode: only what reading and writing a whole
    // UTF-8 file needs.
    function createComTextStream() {
        let text = "";
        return {
            Type: 0,
            Charset: "",
            Open() { text = ""; },
            LoadFromFile(path) { text = fileSystem.readText(path); },
            ReadText: () => text,
            WriteText(newText) { text += newText; },
            SaveToFile(path) { fileSystem.writeText(path, text); },
            Close() {},
        };
    }

    function showMenu(id, items, options = {}) {
        shownMenu = { id, items: [...items], options };
        shownMenuList.push(shownMenu);
        uiMode = "menu";
    }

    // PinballY's pause menu closing, back to the game.
    function closePauseMenu() {
        if (!shownMenu || shownMenu.id !== PAUSE_MENU_ID) return;
        shownMenu = null;
        if (uiMode === "menu") uiMode = "running";
        fire("menuclose", { id: PAUSE_MENU_ID });
    }
    // ResumeGame closes the pause menu at once, and does nothing once the
    // game is over; after KillGame it stays up until the game has exited
    // (gameOver).
    nativeCommands.set(BUILT_IN_COMMANDS.ResumeGame, () => { if (runMode) closePauseMenu(); });
    // Exit Game says "terminating" at once; before the table has loaded,
    // that comes after the launch thread's "runbefore", and the table never
    // starts.
    nativeCommands.set(BUILT_IN_COMMANDS.KillGame, () => {
        if (launch) {
            openLaunch();
            launch.exitChosen = true;
            showOverlayMessage("terminating");
        }
        runMode = "exiting";
    });
    // Displays the Operator Menu (Commands.html).
    nativeCommands.set(BUILT_IN_COMMANDS.ShowOperatorMenu, () => { host.openOperatorMenu(); });
    // Launches the wheel's current table.
    nativeCommands.set(BUILT_IN_COMMANDS.PlayGame, () => {
        const game = host.getCurrentTable();
        if (game) host.playGame(game);
    });

    function getGameInfo(configId) {
        return allTables.find(table => table.configId === configId || table.id === configId) || null;
    }

    function getBuiltInCommand(name) {
        if (!(name in BUILT_IN_COMMANDS)) throw new Error(`The fake host has no built-in command "${name}".`);
        return BUILT_IN_COMMANDS[name];
    }

    // The wheel as with PinballY's "Hide unconfigured games" checked: its
    // default shows them, which a test reproduces with setWheelTables().
    // A table without the flag counts as configured.
    const canBeOnWheel = (game, { includeHidden = false } = {}) => (includeHidden || !game.isHidden) && game.isConfigured !== false;

    // Runs the metafilters over every table, in ascending priority. Narrowing
    // metafilters only: a table stays when every one keeps it, which is what
    // PinballY's "the last one called decides" gives when none widens.
    function runMetaFilters() {
        const ordered = [...metaFilters.values()].sort((a, b) => (a.priority || 0) - (b.priority || 0));
        for (const metaFilter of ordered) if (metaFilter.before) metaFilter.before();
        ruledOutConfigIds = new Set(allTables
            .filter(game => !ordered.every(metaFilter => metaFilter.select(game, true)))
            .map(game => game.configId));
        for (const metaFilter of ordered) if (metaFilter.after) metaFilter.after();
    }

    // The wheel selection before the metafilters, in wheel order.
    const unfilteredWheel = () => (wheelConfigIds === null
        ? host.getVisibleTables().map(game => game.configId)
        : wheelConfigIds);

    // Runs the filter like PinballY: before(), then select() over the
    // visible, configured tables (the hidden ones too with includeHidden,
    // FilterInfo), sorted with compareForSort(); the wheel then shows them
    // from the first one.
    function applyFilter(filterId) {
        const filter = filters.get(filterId);
        if (!filter) throw new Error(`The fake host has no filter "${filterId}".`);
        currentFilterId = filterId;
        if (filter.before) filter.before();
        const selected = allTables
            .filter(game => canBeOnWheel(game, filter) && filter.select(game));
        if (filter.compareForSort) selected.sort(filter.compareForSort);
        if (filter.after) filter.after();
        wheelConfigIds = selected.map(game => game.configId);
        runMetaFilters();
    }

    // Like gameList.setCurFilter(): "All" shows every visible, configured
    // table in collection order, a script filter runs; the current table
    // stays current when the new filter keeps it.
    function setCurrentFilter(filterId) {
        const [current] = host.getWheelTables();
        if (filterId === "All") {
            currentFilterId = filterId;
            wheelConfigIds = allTables
                .filter(game => canBeOnWheel(game))
                .map(game => game.configId);
            runMetaFilters();
        } else if (nativeGroupOf(filterId)) {
            // PinballY's own group filters keep the wheel as it is here.
            currentFilterId = filterId;
            runMetaFilters();
        } else {
            applyFilter(filterId);
        }
        const currentIndex = current ? host.getWheelTables().findIndex(game => game.configId === current.configId) : -1;
        if (currentIndex > 0) setWheelGame(currentIndex);
    }

    // Like gameList.createFilter(): kept under its full id, never shown until selected.
    function createFilter(filter) {
        filters.set(`User.${filter.id}`, filter);
        const cmd = nextFilterCommandId++;
        if (cmd > BUILT_IN_COMMANDS.FilterLast) throw new Error("The fake host has no filter command left.");
        commandIds.set(`filter ${filter.id}`, cmd);
        filterCommands.set(`User.${filter.id}`, cmd);
        return cmd;
    }

    // A script filter runs again from its first table; any other filter
    // keeps its selection, and only the metafilters run again: a table they
    // now rule out leaves the wheel, the next one becoming current.
    function refreshFilter() {
        if (filters.has(currentFilterId)) applyFilter(currentFilterId);
        else runMetaFilters();
    }

    // Like gameList.createMetaFilter(): in effect at once. Narrowing only.
    function createMetaFilter(metaFilter) {
        if (metaFilter.includeExcluded) throw new Error("The fake host has no widening metafilters.");
        const id = nextMetaFilterId++;
        metaFilters.set(id, metaFilter);
        runMetaFilters();
        return id;
    }

    // Like gameList.setWheelGame(): the table at this offset from the current
    // one becomes the current one; the wheel wraps around. The tables the
    // metafilters rule out keep their place, for when they come back.
    function setWheelGame(offset) {
        const shown = host.getWheelTables();
        if (shown.length === 0) return;
        const target = shown[((offset % shown.length) + shown.length) % shown.length].configId;
        const configIds = unfilteredWheel();
        const start = configIds.indexOf(target);
        wheelConfigIds = [...configIds.slice(start), ...configIds.slice(0, start)];
    }

    // Like FilterInfo.groupCmd: the command of the main menu item opening
    // the current filter's group; undefined for a top-level filter.
    function currentFilterGroupCmd() {
        const filter = filters.get(currentFilterId);
        const groupName = filter ? SYSTEM_GROUP_COMMANDS[filter.group] : nativeGroupOf(currentFilterId);
        return groupName ? BUILT_IN_COMMANDS[groupName] : undefined;
    }

    // A filter's command: All Tables', Favorites' or a script filter's.
    function commandOf(filterId) {
        if (filterId === "All") return ALL_TABLES_FILTER_CMD;
        if (filterId === "Favorites") return FAVORITES_FILTER_CMD;
        return filterCommands.get(filterId);
    }

    // The command of the current filter, for its radio mark in the main menu.
    const currentFilterCmd = () => commandOf(currentFilterId);

    // Like FilterInfo.title: the filter's title as the menus show it, in
    // English. A script filter's own title; an Era filter reads like
    // PinballY's decade filters ("1980s Tables"); any other of PinballY's
    // group filters, which the fake does not name, its id.
    function filterTitleOf(filterId) {
        if (filterId === "All") return "All Tables";
        if (filterId === "Favorites") return "Favorites";
        const filter = filters.get(filterId);
        if (filter) return filter.title;
        const era = filterId.match(/^YearRange\.(\d+)\./);
        return era ? `${era[1]}s Tables` : filterId;
    }

    // Like gameList.getFilterInfo(): the filter by its id, with its
    // session-only command (FilterInfo.cmd). Only All Tables, Favorites and
    // the script filters: the fake has no other filter's command.
    function getFilterInfo(filterId) {
        const cmd = commandOf(filterId);
        if (cmd === undefined) throw new Error(`The fake host knows no filter ${filterId}.`);
        return { id: filterId, cmd };
    }

    function allocateCommand(name) {
        const id = nextCommandId++;
        commandIds.set(name, id);
        return id;
    }

    const host = {
        settings,
        now: () => new RealDate(nowMs),
        setTimeout: (callback, ms) => addTimer(callback, ms),
        clearTimeout: removeTimer,
        setInterval: (callback, ms) => addTimer(callback, ms, ms),
        clearInterval: removeTimer,
        getVisibleTables: () => allTables.filter(table => canBeOnWheel(table)),
        getAllTables: () => [...allTables],
        getWheelTables: () => unfilteredWheel()
            .filter(configId => !ruledOutConfigIds.has(configId))
            .map(getGameInfo),
        getCurrentTable: () => host.getWheelTables()[0] || null,
        getGameInfo,
        getWheelImage: wheelImageOf,
        setCurrentFilter,
        createFilter,
        getFilterInfo,
        getCurrentFilterId: () => currentFilterId,
        getCurrentFilterTitle: () => filterTitleOf(currentFilterId),
        getCurrentFilterGroupCmd: currentFilterGroupCmd,
        refreshFilter,
        createMetaFilter,
        setWheelGame,
        getUIMode: () => uiMode,
        getFullUIMode,
        showMenu,
        on,
        one,
        onGameListEvent: on,
        onSettingsEvent: on,
        createDrawingLayer,
        removeDrawingLayer,
        getViewSize: viewSize,
        setUnderlay,
        showWheel,
        getLaunchOverlayBackground: () => launchOverlay.bg,
        resolveGlobalImage,
        createStyledText: (options) => new FakeStyledText(options, (text) => { logLines.push(text); }),
        allocateCommand,
        getBuiltInCommand,
        // Like PinballY's JsDoCommand: carries the command out without
        // firing "command", so no script hears it.
        doCommand: (id) => {
            executedCommands.push(id);
            if (nativeCommands.has(id)) nativeCommands.get(id)();
        },
        // Like the PinballY host: "command" first, then doCommand.
        runCommand: (id) => {
            if (host.dispatchEvent(new FakeCommandEvent(id))) host.doCommand(id);
        },
        // Like SystemClasses.js's EventTarget: runs the listeners, and
        // returns false when one prevented the default.
        dispatchEvent: (ev) => {
            for (const handler of [...(handlers.get(ev.type) || [])]) handler(ev);
            return !(ev.cancelable && ev.defaultPrevented);
        },
        // PinballY clears the table's cached board (docs/research/high-scores.md),
        // then fires the first launch events during this call, and leaves
        // the wheel; a cancelled "prelaunch" launches nothing. command.CaptureGo
        // launches a media capture (LaunchEvent.html).
        playGame: (game, { command: launchCommand = BUILT_IN_COMMANDS.PlayGame } = {}) => {
            highScoreCache.delete(game.configId);
            if (fire("prelaunch", { game, command: launchCommand, overrides: {} }).defaultPrevented) return;
            launchList.push(game);
            uiMode = "running";
            runMode = "starting";
            launch = { game, stage: "loading", exitChosen: false, command: launchCommand };
            fire("launchoverlayshow", { game });
            showOverlayMessage("init");
        },
        getProgramFolder: () => programFolder,
        getProjectFolder: () => projectFolderOf(programFolder),
        getPinballYVersion: () => pinballYVersion,
        countMonitors: () => monitorCount,
        showBackglass: (visible) => { backglassShowCalls.push(visible); },
        getBackglassWindowRect: () => backglassRectOf({ hwndFrame: backglassFrame }),
        createBackglassDrawingLayer,
        removeBackglassDrawingLayer,
        createMediaWindow: (desc) => mediaWindowOf(createRawMediaWindow(desc), FAKE_HWND),
        playSound,
        createSoundRotation,
        runHiddenProgram,
        restartPinballY,
        startPackUpdate,
        installScriptReader,
        httpGet: (url, headers = {}) => sendHttp("GET", url, headers),
        readRegistryValue: (path) => (registryValues.has(path) ? registryValues.get(path) : null),
        openPipe: (name) => {
            const handle = kernel32.CreateFileW(name, GENERIC_READ_WRITE, 0, null, OPEN_EXISTING, 0, null);
            return handle === INVALID_HANDLE ? null : namedPipeOf(kernel32, handle, () => ({ value: 0 }));
        },
        getProcessId: () => FAKE_PINBALLY_PID,
        files: fileSystem,
        log: (text) => { logLines.push(text); },

        // Every restart asked, through either host.
        restartsAsked: () => restartCount,
        // The next restart asked never gets ready.
        failNextRestart() { failingRestartCount++; },
        // The next folder created throws, as Windows does on a denied folder.
        failNextFolderCreation() { failingFolderCreationCount++; },
        // The next file copied throws, as Windows does on a denied file.
        failNextCopy() { failingCopyCount++; },
        // Every Pack Update asked, through either host: { zipUrl, sha256, packVersion }.
        packUpdatesAsked: () => packUpdateList.map(update => ({ ...update })),
        // The next Pack Update asked never gets ready.
        failNextPackUpdate() { failingPackUpdateCount++; },
        // Every Script Reader install asked, through either host: { zipUrl, sha256, version }.
        scriptReaderInstallsAsked: () => scriptReaderInstallList.map(install => ({ ...install })),
        // How the next Script Reader install ends, through either host:
        // { exitCode (0), output, durationMs, hangs, vpxtool (what the
        // swapped-in vpxtool.exe answers, as addProgram describes it) };
        // by default it succeeds after 3 s.
        answerNextScriptReaderInstall(answer) { scriptReaderInstallAnswers.push({ ...answer }); },
        // Queues the reply to the next HTTP request, through either host:
        // { status (200), statusText, text }.
        replyToHttp(reply) { httpReplies.push({ ...reply }); },
        httpRequests: () => httpRequestList.map(request => ({ ...request, headers: { ...request.headers } })),

        // Moves the date without running the timers.
        setNow(date) { nowMs = date.getTime(); },
        // How long each layer draw takes from now on (the drawMs option).
        setDrawMs(ms) { currentDrawMs = ms; },
        advanceTime,
        // Intervals still running (a frame timer left on keeps redrawing).
        runningIntervalCount: () => timers.filter(timer => timer.intervalMs !== undefined).length,
        // Timers and intervals not run or cleared yet.
        pendingTimerCount: () => timers.length,
        // The window's new size, as PinballY gives it after the scripts' init:
        // seen by the next draw without a size and by getViewSize(), and told to no script.
        setLayoutSize(size) { currentLayoutSize = { ...size }; },
        drawingLayers: () => [...layers],
        // The backglass window's layers, listed whatever the window's state.
        backglassDrawingLayers: () => [...backglassLayers],
        underlay: () => underlayFile,
        wheelShown: () => wheelShown,
        // The launch overlay's layers, { bg, fg }.
        launchOverlay: () => launchOverlay,
        drawings: () => drawingList.map(drawing => ({ ...drawing, texts: [...drawing.texts], images: [...drawing.images] })),
        soundsPlayed: () => sounds.map(sound => sound.filePath),
        // The id of the player each sound played on, in the same order.
        soundPlayers: () => sounds.map(sound => sound.playerId),
        // Seeds a file (and its folders) without recording a write, modified
        // now unless a date is given; content is text, or bytes as a Uint8Array.
        addFile(filePath, content = "", { modified = new RealDate(nowMs) } = {}) {
            addFolder(parentFolder(filePath));
            files.set(filePath, content);
            modifiedDates.set(filePath, modified.getTime());
        },
        // Seeds a program file and what it does when run: describe(args)
        // gives { output, errorOutput, exitCode, durationMs }, all optional.
        addProgram(filePath, describe) {
            host.addFile(filePath, "program");
            programs.set(filePath, describe);
        },
        // The board PINemHi reads now in the table's NVRAM (shared by the
        // tables of the same ROM), as raw lines; a run takes durationMs,
        // fails when fails is set or PinballY kills it, never answers when
        // hangs is set.
        setNvramBoard(configId, lines, { durationMs = 1000, fails = false, hangs = false } = {}) {
            nvramBoards.set(boardKeyOf(getGameInfo(configId)), { lines: [...lines], durationMs, fails, hangs });
        },
        // Seeds a registry value, by its full path ("HKCU\\Software\\...\\name").
        setRegistryValue(path, value) { registryValues.set(path, value); },
        programRuns: () => programRunList.map(run => ({ program: run.program, args: [...run.args] })),
        // Seeds an image file that exists but cannot be decoded.
        addUnreadableImage(filePath) {
            host.addFile(filePath, "not an image");
            unreadableImages.add(filePath);
        },
        // Locks a file as another program holding it open would.
        lockFile(filePath) { lockedFiles.add(filePath); },
        unlockFile(filePath) { lockedFiles.delete(filePath); },
        // The file is listed in its folder, but gone by the time readBytes reads it.
        vanishBeforeRead(filePath) { vanishingFiles.add(filePath); },
        // Each read of the file moves the clock on by ms, like a slow disk.
        slowDownReads(filePath, ms) { readMsByPath.set(filePath, ms); },
        addFolder,
        // Removes the folder with everything in it, as a player would by hand.
        removeFolder(folderPath) {
            const folder = withoutTrailingSlash(folderPath);
            const isInside = path => path === folder || path.startsWith(`${folder}\\`);
            for (const path of [...folders]) if (isInside(path)) folders.delete(path);
            for (const path of [...files.keys()]) if (isInside(path)) files.delete(path);
        },
        // The file's text, or undefined when it doesn't exist.
        readFile: (filePath) => files.get(filePath),
        fileOperations: () => fileOperationList.map(operation => ({ ...operation })),
        fileReads: () => [...fileReadList],
        // Kernel32 file handles not closed yet.
        openFileHandleCount: () => openFileHandles.size,
        // Starts a fake Discord (tests/support/fake_discord.js) on
        // \\?\pipe\discord-ipc-<pipeNumber>, and returns it.
        startDiscord({ pipeNumber = 0, holdReady = false } = {}) {
            const discord = createFakeDiscord({ holdReady });
            discordPipes.set(`${PIPE_PREFIX}discord-ipc-${pipeNumber}`, discord);
            return discord;
        },
        // Every pipe open tried, through either host, by name.
        pipeOpens: () => [...pipeOpenList],
        openPipeHandleCount: () => openPipeHandles.size,
        setTables(newTables) { allTables = newTables.map(withMedia); },
        highScoreSets: () => highScoreSetList.map(set => ({ configId: set.configId, lines: set.lines && [...set.lines] })),
        gameUpdates: () => gameUpdateList.map(update => ({ configId: update.configId, changes: { ...update.changes } })),
        // The current wheel selection, in wheel order (index 0 is the current
        // table), optionally under a filter id such as "Favorites".
        setWheelTables(configIds, { filterId = currentFilterId } = {}) {
            const unknown = configIds.filter(configId => !getGameInfo(configId));
            if (unknown.length > 0) throw new Error(`Unknown tables in the wheel: ${unknown.join(", ")}`);
            wheelConfigIds = [...configIds];
            currentFilterId = filterId;
            runMetaFilters();
        },
        currentFilterId: () => currentFilterId,
        // The player moves the wheel by this offset (Next, Prev, Next Page...):
        // unlike setWheelGame(), PinballY fires "gameselect" with the new table.
        moveWheel(offset) {
            setWheelGame(offset);
            fire("gameselect", { game: host.getWheelTables()[0] || null });
        },
        // Shows a script filter, by its full id ("User.<id>").
        selectFilter: applyFilter,
        // The script filters' descriptions, as created.
        scriptFilters: () => [...filters.values()],
        upperStatusLine: () => upperStatusLine.map(entry => entry.text),
        lowerStatusLine: () => lowerStatusLine.map(entry => entry.text),
        showOnUpperStatusLine,
        showOnLowerStatusLine,
        seedSettings(values) {
            for (const [key, value] of Object.entries(values)) storedSettings.set(key, toStoredString(value));
        },
        storedSettings: () => Object.fromEntries(storedSettings),
        writtenSettingsKeys: () => new Set(writtenKeys),
        commandId: (name) => commandIds.get(name),
        // What PinballY does on doCommand(id), such as opening a submenu.
        setNativeCommand(id, action) { nativeCommands.set(id, action); },
        fire,

        shownMenus: () => [...shownMenuList],
        currentMenu: () => shownMenu,

        // A menu opened by the player (unlike showMenu, which doesn't fire
        // "menuopen"): handlers may add items, or delete them by command id
        // then tidy the separators, before it is shown. options: as
        // showMenu's ({ dialogStyle }), read in ev.options.
        openMenu(id, items, options = {}) {
            let menuItems = [...items];
            const ev = fire("menuopen", {
                id,
                options,
                get items() { return menuItems; },
                set items(newItems) { menuItems = newItems; },
                // Like PinballY: after a command id it does not find, at the end.
                addMenuItem(where, newItems) {
                    const toAdd = Array.isArray(newItems) ? newItems : [newItems];
                    const afterIndex = menuItems.findIndex(item => item.cmd === where.after);
                    menuItems.splice(afterIndex === -1 ? menuItems.length : afterIndex + 1, 0, ...toAdd);
                },
                deleteMenuItem(cmd) {
                    menuItems = menuItems.filter(item => item.cmd !== cmd);
                    this.menuUpdated = true;
                },
                // Like PinballY: each run of separators becomes a single
                // one, counting only those titled "" (an untitled one is not).
                tidyMenu() {
                    const isSeparator = item => item?.cmd < 0 && item.title === "";
                    menuItems = menuItems.filter((item, index) => !isSeparator(item) || !isSeparator(menuItems[index - 1]));
                    this.menuUpdated = true;
                },
            });
            // Like PinballY's FireMenuEvent: a menu marked updated is shown
            // even when "menuopen" was cancelled; preventDefault() only
            // stops the unchanged native menu.
            // A listener may show another menu in its place by changing ev.id.
            if (ev.menuUpdated || !ev.defaultPrevented) showMenu(ev.id, menuItems, ev.options);
        },

        // The Exit menu as PinballY opens it on the Exit button, with its
        // native items; PinballY's own separators are titled "". Where Help
        // and About sit is not documented: to be checked on the cabinet.
        openExitMenu() {
            host.openMenu("exit", [
                { title: "Exit PinballY", cmd: BUILT_IN_COMMANDS.Quit },
                { title: "Shut Down", cmd: BUILT_IN_COMMANDS.PowerOff },
                { title: "", cmd: -1 },
                { title: "Operator Menu", cmd: BUILT_IN_COMMANDS.ShowOperatorMenu },
                { title: "", cmd: -1 },
                { title: "Help", cmd: BUILT_IN_COMMANDS.Help },
                { title: "About PinballY", cmd: BUILT_IN_COMMANDS.AboutBox },
                { title: "", cmd: -1 },
                { title: "Cancel", cmd: BUILT_IN_COMMANDS.MenuReturn },
            ]);
        },

        // The Operator Menu as PinballY opens it (from the Exit menu, or the
        // coin door's service button), with some of the native items
        // OperatorMenu.html lists, in its order; its separators are not
        // documented: to be checked on the cabinet.
        openOperatorMenu() {
            host.openMenu("operator", [
                { title: "Game Setup", cmd: BUILT_IN_COMMANDS.ShowGameSetupMenu },
                { title: "Batch Capture", cmd: BUILT_IN_COMMANDS.BatchCaptureStep1 },
                { title: "", cmd: -1 },
                { title: "Reset Coins/Credits", cmd: BUILT_IN_COMMANDS.ClearCredits },
                { title: "PinballY Options", cmd: BUILT_IN_COMMANDS.Options },
                { title: "", cmd: -1 },
                { title: "Enable Videos", cmd: BUILT_IN_COMMANDS.EnableVideos },
                { title: "Mute Videos", cmd: BUILT_IN_COMMANDS.MuteVideos },
                { title: "", cmd: -1 },
                { title: "Help", cmd: BUILT_IN_COMMANDS.Help },
                { title: "About PinballY", cmd: BUILT_IN_COMMANDS.AboutBox },
                { title: "", cmd: -1 },
                { title: "Cancel", cmd: BUILT_IN_COMMANDS.MenuReturn },
            ]);
        },

        // The pause menu as PinballY opens it during a game: twice in a row,
        // first in the running mode, then in the menu mode, the first
        // closing 150 ms later while the second stays open.
        openPauseMenu() {
            const items = () => PAUSE_MENU_ITEMS.map(([title, name], index) => ({ title, cmd: BUILT_IN_COMMANDS[name], selected: index === 0 }));
            host.openMenu(PAUSE_MENU_ID, items());
            host.openMenu(PAUSE_MENU_ID, items());
            addTimer(() => fire("menuclose", { id: PAUSE_MENU_ID }), PAUSE_FIRST_CLOSE_MS);
        },

        // The main menu as PinballY opens it, with its native items: "Play",
        // the information section, Rate Table / Add to Favorites, the [Top]
        // filters (PinballY's All Tables and Favorites, the scripts' ones
        // between them by sort key; the current one marked radio), the
        // filter groups, then Return. Its separators, and whether a group
        // holding the current filter is marked, are not documented: to be
        // checked on the cabinet.
        openMainMenu() {
            const topFilters = [...filters.entries()]
                .filter(([, filter]) => filter.group === "[Top]")
                .map(([id, filter]) => ({ sortKey: filter.sortKey || "", title: filter.menuTitle || filter.title, cmd: filterCommands.get(id) }));
            topFilters.push({ sortKey: "3000", title: "All Tables", cmd: ALL_TABLES_FILTER_CMD });
            topFilters.push({ sortKey: "7000", title: "Favorites", cmd: FAVORITES_FILTER_CMD });
            topFilters.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
            const filterGroup = (title, name) => ({ title, cmd: BUILT_IN_COMMANDS[name], hasSubmenu: true });
            host.openMenu("main", [
                { title: "Play", cmd: BUILT_IN_COMMANDS.PlayGame },
                { title: "", cmd: -1 },
                { title: "Information", cmd: BUILT_IN_COMMANDS.GameInfo },
                { title: "Flyer", cmd: BUILT_IN_COMMANDS.Flyer },
                { title: "High Scores", cmd: BUILT_IN_COMMANDS.HighScores },
                { title: "Instruction Card", cmd: BUILT_IN_COMMANDS.Instructions },
                { title: "", cmd: -1 },
                { title: "Rate Table", cmd: BUILT_IN_COMMANDS.RateGame },
                { title: "Add to Favorites", cmd: BUILT_IN_COMMANDS.AddFavorite },
                { title: "", cmd: -1 },
                ...topFilters.map(({ title, cmd }) => (cmd === currentFilterCmd() ? { title, cmd, radio: true } : { title, cmd })),
                { title: "", cmd: -1 },
                filterGroup("Filter by Era", "FilterByEra"),
                filterGroup("Filter by Manufacturer", "FilterByManufacturer"),
                filterGroup("Filter by System", "FilterBySystem"),
                filterGroup("Filter by Category", "FilterByCategory"),
                filterGroup("Filter by Rating", "FilterByRating"),
                filterGroup("Filter by Last Played", "FilterByRecency"),
                filterGroup("Filter by Date Added", "FilterByAdded"),
                { title: "", cmd: -1 },
                { title: "Return", cmd: BUILT_IN_COMMANDS.MenuReturn },
            ]);
        },

        // Closes the current menu (as Escape would). Back to the wheel only if
        // no table was launched from the menu and no "menuclose" handler
        // opened another menu in the meantime.
        closeMenu() {
            if (!shownMenu) throw new Error("No menu is open.");
            // Back to the game still running, not to the wheel.
            if (shownMenu.id === PAUSE_MENU_ID && runMode) {
                closePauseMenu();
                return;
            }
            const { id } = shownMenu;
            shownMenu = null;
            if (uiMode === "menu") uiMode = "wheel";
            fire("menuclose", { id });
            if (uiMode === "wheel") fire("wheelmode");
        },

        // The Exit button in a native menu: PinballY runs MenuReturn, which
        // closes it (Commands.html; an Exit menu set to treat Exit as Select
        // aside). Whether a "command" event fires for it is not documented:
        // modelled without one, a MenuReturn entry covering the other case.
        pressExitInMenu() {
            host.closeMenu();
        },

        // Picks the item with this title in the current menu: fires its
        // command, then carries it out as PinballY does unless a listener
        // prevented it, then closes the menu, unless the item stays open. A
        // menu shown by the command replaces it: only its "menuclose" fires.
        selectMenuItem(title) {
            const menu = shownMenu;
            const item = menu && menu.items.find(menuItem => menuItem.title === title);
            if (!item) throw new Error(`No menu item titled "${title}" is showing.`);
            const ev = fire("command", { id: item.cmd });
            if (!ev.defaultPrevented && nativeCommands.has(item.cmd)) nativeCommands.get(item.cmd)();
            // Closed by the command itself (ResumeGame), "menuclose" included.
            if (shownMenu === null) return;
            if (shownMenu !== menu) fire("menuclose", { id: menu.id });
            // End Game's pause menu stays up until the game has exited (gameOver).
            else if (!item.stayOpen && item.cmd !== BUILT_IN_COMMANDS.KillGame) host.closeMenu();
        },

        // The cabinet enters attract mode after a while on its own: PinballY
        // then moves the wheel itself ("gameselect" outside wheel mode).
        // A native menu open closes with it, after "attractmodestart" (the
        // order is not documented: to be checked on the cabinet).
        enterAttractMode() {
            uiMode = "attract";
            fire("attractmodestart");
            if (shownMenu) {
                const { id } = shownMenu;
                shownMenu = null;
                fire("menuclose", { id });
            }
        },
        // A button press ends attract mode, back to the wheel.
        exitAttractMode() {
            fire("attractmodeend");
            returnToWheel();
        },

        launches: () => [...launchList],
        // capture: "single" or "batch" for a media capture's game; "single"
        // by default for a game launched with command.CaptureGo.
        gameStarted(game, { capture } = {}) {
            const capturing = launch && launch.command === BUILT_IN_COMMANDS.CaptureGo;
            openLaunch();
            uiMode = "running";
            runMode = "running";
            captureMode = capture ?? (capturing ? "single" : undefined);
            showOverlayMessage(capture ? "capturing" : "running");
            if (launch) launch.stage = "started";
            fire("gamestarted", launchPropertiesOf(game));
        },
        // The game ending with the pause menu open, as seen on the cabinet
        // during a capture (docs/adr/0013): the closing events up to
        // "postlaunch" fire, then one "menuclose", and the pause menu stays
        // open, with no game left for ResumeGame to resume.
        gameOverUnderPauseMenu(game) {
            closeLaunch(game);
            runMode = undefined;
            captureMode = undefined;
            fire("postlaunch", launchPropertiesOf(game));
            fire("menuclose", { id: PAUSE_MENU_ID });
        },
        gameOver(game) {
            closeLaunch(game);
            fire("postlaunch", launchPropertiesOf(game));
            closePauseMenu();
            returnToWheel();
        },
        // The overlay's hide fires twice, a few milliseconds apart, as seen
        // on the cabinet.
        launchError(game) {
            openLaunch();
            runMode = "exiting";
            fire("launcherror", { game });
            fire("launchoverlayhide", { game });
            fire("launchoverlayhide", { game });
            launch = null;
            fire("postlaunch", launchPropertiesOf(game));
            returnToWheel();
        },

        logLines: () => [...logLines],
        executedCommands: () => [...executedCommands],
        backglassShowCalls: () => [...backglassShowCalls],
        // Every custom window created, in order: { desc, borderlessMode(),
        // showMediaWhenRunningFlag(), isVisible(), calls(), windowRect(), layers(), resize() }.
        mediaWindows: () => [...mediaWindowList],

        // Exposes this fake as PinballY's globals; returns the function that
        // restores the previous globals.
        // Whether code reaching PinballY through the globals (main.js and the
        // shared modules) listens to this fake.
        isHeardThroughGlobals: () => heardThroughGlobals,
        installGlobals() {
            // main.js and the shared modules load once per process and listen
            // to the first fake: a second one would never hear them.
            if (installedHost !== null && installedHost !== host && installedHost.isHeardThroughGlobals()) {
                throw new Error("A second fake host installs its globals while the first one's still hold PinballY listeners: "
                    + "main.js and the shared modules load once per process, so put each scenario test in a file of its own.");
            }
            installedHost = host;
            const globalNames = [
                "optionSettings", "gameList", "mainWindow", "command", "logfile", "Date",
                "StyledText", "CommandEvent", "systemInfo", "createAutomationObject",
                "setTimeout", "clearTimeout", "setInterval", "clearInterval",
                "backglassWindow", "dllImport", "HttpRequest", "HWND",
            ];
            const previous = globalNames.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);

            class FakeDate extends RealDate {
                constructor(...args) {
                    if (args.length === 0) super(nowMs);
                    else super(...args);
                }
                static now() { return nowMs; }
            }

            Object.assign(globalThis, {
                optionSettings: {
                    get: settings.getString,
                    getInt: settings.getInt,
                    getFloat: settings.getFloat,
                    getBool: settings.getBool,
                    set: settings.set,
                    // "settingsreload", fired with fire() like the main window's events.
                    on,
                },
                gameList: {
                    getAllGames: () => [...allTables],
                    getAllWheelGames: () => host.getWheelTables(),
                    // "gameselect" and "filterselect", fired with fire() like the main window's events.
                    on: onThroughGlobals,
                    getWheelGame: (offset) => host.getWheelTables()[offset] || null,
                    getWheelCount: () => host.getWheelTables().length,
                    createFilter,
                    getCurFilter: () => ({ id: currentFilterId, title: filterTitleOf(currentFilterId), groupCmd: currentFilterGroupCmd() }),
                    getFilterInfo,
                    setCurFilter: setCurrentFilter,
                    setWheelGame: (offset) => { setWheelGame(offset); },
                    refreshFilter,
                    createMetaFilter,
                    getGameInfo,
                    resolveMedia: (subfolder, baseName) => resolveGlobalImage(subfolder, baseName),
                },
                mainWindow: {
                    on: onThroughGlobals,
                    showMenu,
                    getUIMode: getFullUIMode,
                    playGame: host.playGame,
                    doCommand: host.doCommand,
                    dispatchEvent: host.dispatchEvent,
                    createDrawingLayer,
                    removeDrawingLayer,
                    createMediaWindow: createRawMediaWindow,
                    // HWNDObject.html: the client rectangle, relative to its
                    // own upper left corner; the view is as large as the layers' window.
                    hwndView: {
                        getWindowPos: () => {
                            const { width, height } = viewSize();
                            return { clientRect: { left: 0, top: 0, right: width, bottom: height } };
                        },
                    },
                    setUnderlay,
                    showWheel,
                    launchOverlay,
                    statusLines: {
                        upper: statusLineObject(upperStatusLine),
                        lower: statusLineObject(lowerStatusLine),
                    },
                },
                command: { ...BUILT_IN_COMMANDS, allocate: allocateCommand },
                logfile: { log: (text) => { logLines.push(text); } },
                Date: FakeDate,
                // Zero-delay timeouts stay on the real event loop, so the
                // add-ons' "next tick" deferrals still run on settle(); every
                // other timer waits for advanceTime().
                setTimeout: (callback, ms = 0) => (ms > 0 ? addTimer(callback, ms) : realSetTimeout(() => {
                    isPastInit = true;
                    callback();
                }, 0)),
                clearTimeout: (id) => {
                    if (typeof id === "number") removeTimer(id);
                    else realClearTimeout(id);
                },
                setInterval: (callback, ms) => addTimer(callback, ms, ms),
                clearInterval: removeTimer,
                StyledText: FakeStyledText,
                CommandEvent: FakeCommandEvent,
                HttpRequest: FakeHttpRequest,
                HWND: FAKE_HWND,
                systemInfo: { programDir: programFolder, version: pinballYVersion },
                backglassWindow: {
                    showWindow: (visible) => { backglassShowCalls.push(visible); },
                    hwndFrame: backglassFrame,
                    createDrawingLayer: createBackglassDrawingLayer,
                    removeDrawingLayer: removeBackglassDrawingLayer,
                },
                // Only User32's GetSystemMetrics, for the monitor count
                // (SM_CMONITORS), and Shell32's ShellExecuteW, for cmd.exe
                // and the restart helper run hidden, and Kernel32's file
                // reads, Discord's pipes and process id; any other DLL throws. create() gives a native
                // variable for an out parameter.
                dllImport: {
                    bind: (dllName) => {
                        if (dllName.toLowerCase() === "user32.dll") return { GetSystemMetrics: (index) => (index === 80 ? monitorCount : 0) };
                        if (dllName.toLowerCase() === "shell32.dll") return { ShellExecuteW: shellExecute };
                        if (dllName.toLowerCase() === "kernel32.dll") return kernel32;
                        throw new Error(`The fake host has no DLL "${dllName}".`);
                    },
                    create: () => ({ value: 0 }),
                },
                // Only Windows Media Player, WScript.Shell's RegRead, and the file objects over the
                // in-memory file system (no .env.local unless a test adds
                // one, so common/core/config.js imported after this keeps its
                // defaults). Any other COM object throws.
                createAutomationObject: (progId) => {
                    if (progId === "WMPlayer.OCX.7") return createComMediaPlayer();
                    if (progId === "Scripting.FileSystemObject") return createComFileSystem();
                    if (progId === "ADODB.Stream") return createComTextStream();
                    if (progId === "WScript.Shell") return createComShell();
                    throw new Error(`The fake host has no COM object "${progId}".`);
                },
            });

            return function uninstallGlobals() {
                if (installedHost === host) installedHost = null;
                for (const [name, descriptor] of previous) {
                    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
                    else delete globalThis[name];
                }
            };
        },
    };

    return host;
}
