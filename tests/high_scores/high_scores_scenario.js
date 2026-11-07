// ============================================================
// High Scores tests' scenario: main.js on the fake globals with chosen
// Add-ons and Profiles. Sets the NVRAM, VPReg.stg and text boards before and
// after a Play, plays, switches and resets Profiles, and reads back the file,
// toasts, Achievements and log lines. Never loaded by PinballY.
// - Change the cabinet mid-test through the fake host (removeFolder, setTables).
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { getProfileStore } from "../../common/profiles/profile_store.js";
import { writeCompoundFile } from "../support/compound_file_writer.js";

export const NOW = new Date(2026, 9, 12, 20, 0, 0);
export const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const NAVIGATION_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";
export const HIGH_SCORES_FILE = `${PROFILES_FOLDER}\\high_scores.json`;
// A Profile's own Avatar file, and files to seed for those Profiles' Avatars.
export const avatarOf = name => `${PROFILES_FOLDER}\\${name}\\avatar.png`;
export const avatarFiles = (...names) => Object.fromEntries(names.map(name => [avatarOf(name), "png"]));
// The pack's Default Score images, by number (1 for default_score_01.png),
// and files to seed for those numbers.
export const DEFAULT_SCORE_IMAGES_PATH = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\default_scores";
export const defaultScoreImageOf = number => `${DEFAULT_SCORE_IMAGES_PATH}\\default_score_${String(number).padStart(2, "0")}.png`;
export const defaultScoreImageFiles = (...numbers) => Object.fromEntries(numbers.map(number => [defaultScoreImageOf(number), "png"]));
// The owner's own Default Score images, in the local\ folder kept out of git.
export const localDefaultScoreImageOf = number => `${DEFAULT_SCORE_IMAGES_PATH}\\local\\default_score_${String(number).padStart(2, "0")}.png`;
export const GAME_MS = 5 * 60 * 1000;
// Covers the wait after "postlaunch" and the reads, a second at a time.
const READS_STEPS = 15;

// ROM tables of no system: no User folder is read for them, so a ROM-less
// fallback needs { ...table, system: VPX_SYSTEM }.
export const MEDIEVAL = "Medieval Madness (Williams 1997)";
export const AFM = "Attack from Mars (Bally 1995)";
export const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", manufacturer: "Williams", year: 1997, isHidden: false, rom: "mm_109c" },
    { id: 2, configId: AFM, title: "Attack from Mars", manufacturer: "Bally", year: 1995, isHidden: false, rom: "afm_113b" },
];

// The VPX system of the cabinet's tables, and its User folder's VPReg.stg.
export const VPX_SYSTEM = { exe: "C:\\vPinball\\VisualPinball\\VPinballX64.exe" };
export const VPREG_PATH = "C:\\vPinball\\VisualPinball\\User\\VPReg.stg";
// An original table, with no ROM.
export const ZELDA = "Zelda (Original 2023)";
export const ZELDA_TABLE = { id: 3, configId: ZELDA, title: "Zelda", manufacturer: "Original", year: 2023, isHidden: false, system: VPX_SYSTEM };

// The User folder's "5 scores + 5 initials" text files, by name.
export const USER_FOLDER = "C:\\vPinball\\VisualPinball\\User";
export const userFileOf = name => `${USER_FOLDER}\\${name}`;
// Smurf tables, with no ROM, keeping their board in a text file.
export const PAPASMURF = "Le Grand Schtroumpf (Original 2022)";
export const PAPASMURF_TABLE = { id: 4, configId: PAPASMURF, title: "Le Grand Schtroumpf", manufacturer: "Original", year: 2022, isHidden: false, system: VPX_SYSTEM };
export const SMURFETTE = "La Schtroumpfette (Original 2022)";
export const SMURFETTE_TABLE = { id: 5, configId: SMURFETTE, title: "La Schtroumpfette", manufacturer: "Original", year: 2022, isHidden: false, system: VPX_SYSTEM };
// A text file's lines as the Smurf tables write them: leading settings
// lines, five scores, five initials; each entry is [initials, score].
export const textBoard = (settings, ...entries) => [...settings, ...entries.map(entry => String(entry[1])), ...entries.map(entry => entry[0]), ""].join("\n");

// A VPReg.stg section of the HighScoreN family; each entry is [initials, score].
export const vpregBoard = (...entries) => Object.fromEntries(entries.flatMap(([initials, score], index) => [
    [`HighScore${index + 1}`, String(score)], [`HighScore${index + 1}Name`, initials],
]));
// Zelda's section as on the cabinet, and settings sections around it.
export const ZELDA_FACTORY = vpregBoard(["AAA", 2800000], ["BBB", 2700000], ["CCC", 2600000], ["DDD", 2500000]);
export const OTHER_SECTIONS = { ww_lh6: { LUT: "1" }, burner: vpregBoard(["AAA", 1500000], ["BBB", 1400000]) };

// count tables, "Table 1 (Williams 1990)" on, each on its own ROM.
export const romTables = count => Array.from({ length: count }, (_, index) => ({
    id: index + 1, configId: `Table ${index + 1} (Williams 1990)`, title: `Table ${index + 1}`,
    manufacturer: "Williams", year: 1990, isHidden: false, rom: `rom_${index + 1}`,
}));
// Play Scores: vpxtool in the pack's tools folder, VPinMAME's NVRAM folder
// (from the registry), and ROM tables whose .vpx exists.
export const VPXTOOL = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\vpxtool.exe";
export const NVRAM_FOLDER = "C:\\vPinball\\VisualPinball\\VPinMAME\\nvram";
const NVRAM_REGISTRY_KEY = "HKCU\\Software\\Freeware\\Visual PinMame\\globals\\nvram_directory";
export const PLAY_SCORE_COPY_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\play_scores";
export const nvFileOf = rom => `${NVRAM_FOLDER}\\${rom}.nv`;
export const withGameFile = table => ({ ...table, gameFile: `C:\\vPinball\\VisualPinball\\Tables\\${table.configId}.vpx` });
export const VPX_TABLES = TABLES.map(withGameFile);
// What vpxtool's "nvram show" prints of a .nv's game_state (the fake .nv
// holds this text, which the fake vpxtool prints back): a WPC map by
// default, with player_count and game_over; null for a value outside the NVRAM.
export function lastGame(scores, { playerCount = 1, gameOver = true, finalScores, fileFormat = 0.8 } = {}) {
    const field = value => (value === null ? { warning: "Failed to resolve: Value is stored outside the NVRAM" } : { value });
    const slots = list => list.map((value, index) => ({ label: `Player ${index + 1}`, ...field(value) }));
    const gameState = { player_count: field(playerCount), game_over: field(gameOver), scores: slots(scores) };
    if (finalScores) gameState.final_scores = slots(finalScores);
    return JSON.stringify({ _fileformat: fileFormat, game_state: gameState }, null, 2);
}
// The Play Score anomaly log, and its rotated older file.
export const ANOMALY_LOG = "C:\\PinballY\\Scripts\\ExpansionPack\\play_scores_anomalies.log";
export const OLD_ANOMALY_LOG = "C:\\PinballY\\Scripts\\ExpansionPack\\play_scores_anomalies.old.log";

// Longer than a toast's whole life (rise, hold, fade).
const ONE_TOAST_MS = 6000;

// What PINemHi prints for a ROM it does not support.
export const NOT_SUPPORTED = ["Not supported rom : C:\\vPinball\\VisualPinball\\VPinMAME\\nvram\\mm_109c.nv", ""];

// A board as PINemHi prints it: a Grand Champion, then numbered places;
// each entry is [initials, score].
export function boardLines(champion, places) {
    return [
        "GRAND CHAMPION",
        `${champion[0]} ${champion[1]}`,
        "",
        "HIGHEST SCORES",
        ...places.map(([initials, score], index) => `${index + 1}) ${initials} ${score}`),
        "",
        "LOOP CHAMPION",
        "BRE 20 LOOPS",
    ];
}

// boardLines from a list of entries, the first place first.
export const board = (...entries) => boardLines(entries[0], entries.slice(1));
// A factory board of five places.
export const FACTORY = board(["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"], ["RCF", "10000000"]);
// A board with no place yet, as after a reset that cleared it.
export const EMPTY_BOARD = ["HIGHEST SCORES", ""];
// The factory board with a new second place.
export const SECOND_PLACE = board(["SLL", "52000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]);
// The High Scores family's IDs among these Achievement IDs.
export const highScoreIds = ids => ids.filter(id => id.startsWith("highScoreTables:") || id.startsWith("tableRecord"));

// addOns: the Add-ons on; profiles: { name: { isChild, ...more of its
// profile.json } }, Guest's under "guest"; active: the Profile in
// cabinet.json; files: { path: content } seeded before startup; language:
// the interface language; vpxtool: installed, answering "nvram show" with
// the .nv's text; nvFiles: { rom: lastGame(...) } in the NVRAM folder, which
// exists once either is given.
export async function startHighScores({
    addOns = ["highScores"], profiles = {}, active = "guest", tables = TABLES, files = {}, language = "en", vpxtool = false, nvFiles = {},
} = {}) {
    const fake = createFakePinballYHost({ now: NOW, tables });
    if (vpxtool || Object.keys(nvFiles).length > 0) {
        fake.setRegistryValue(NVRAM_REGISTRY_KEY, NVRAM_FOLDER);
        fake.addFolder(NVRAM_FOLDER);
        for (const table of tables) if (table.gameFile) fake.addFile(table.gameFile, "vpx");
    }
    for (const [rom, text] of Object.entries(nvFiles)) fake.addFile(nvFileOf(rom), text, { modified: new Date(2026, 0, 1) });
    if (vpxtool) {
        fake.addProgram(VPXTOOL, args => (args[0] === "nvram" && args[1] === "show"
            ? { output: fake.readFile(args[2]) ?? "" }
            : { exitCode: 2, output: "" }));
    }
    for (const [name, { isChild = false, ...data } = {}] of Object.entries(profiles)) {
        fake.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], ...(isChild ? { isChild } : {}), ...data }));
    }
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: active }));
    for (const [path, content] of Object.entries(files)) fake.addFile(path, content);
    // The High Score Board plays it on each move of its Selection Marker.
    fake.addFile(NAVIGATION_SOUND);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = language;
    config.startupScreen = "welcome";

    // Imported once the language is set: the toast module and the
    // Achievement List read the texts.
    const { toastDrawings } = await import("../achievements/achievement_toast_reader.js");
    const { pressAndGlide, readRows, untilListShown } = await import("../achievements/achievement_list_reader.js");
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    // With the Profile picker off, main.js switched to Guest.
    if (getProfileStore().getActiveProfile().name !== active) getProfileStore().switchTo(active);

    // A second at a time, so each read's answer settles before its timeout falls due.
    const finishReads = async () => {
        for (let step = 0; step < READS_STEPS; step++) {
            await settle();
            fake.advanceTime(1000);
        }
        await settle();
    };

    // Lets every waiting toast show, so each Achievement is Notified.
    async function showEveryToast() {
        for (let guard = 0; guard < 100; guard++) {
            const shownCount = toastDrawings(fake).length;
            fake.advanceTime(ONE_TOAST_MS);
            await settle();
            if (toastDrawings(fake).length === shownCount) break;
        }
    }

    return {
        fake,
        showEveryToast,
        resetProfile: (name) => getProfileStore().resetProfile(name),
        // The IDs of the Achievements the named Profile was Notified of.
        notified: (name) => [...getProfileStore().getNotifiedOf(name)],
        // How the Achievement List shows each Achievement of these titles:
        // { title, progress, unlocked }, progress the short text of its
        // Achievement Progress or null; undefined for a title not in the
        // list. Opened from the main menu and closed again with Exit.
        readShown: (titles) => {
            fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
            fake.selectMenuItem(lang.achievementList.menuEntry);
            untilListShown(fake);
            const rows = readRows(fake, lang.achievementList);
            pressAndGlide(fake, "Exit");
            return titles.map(title => {
                const row = rows.find(shown => shown.title === title);
                return row && { title, progress: row.progress, unlocked: row.unlocked };
            });
        },
        // What PINemHi reads in the table's NVRAM from now on.
        setBoard: (configId, lines, options) => fake.setNvramBoard(configId, lines, options),
        // The sections VPX's VPReg.stg holds from now on ({ section: { value: text } }).
        setVpreg: (sections) => fake.addFile(VPREG_PATH, writeCompoundFile(sections)),
        switchTo: (name) => getProfileStore().switchTo(name),
        // The named Profile's Personal Board on the table as the High Score
        // Board gets it: { rank, score, date }.
        personalBoard: async (configId, name) => {
            const { getHighScoreStore } = await import("../../common/high_scores/high_score_store.js");
            return getHighScoreStore().personalBoardOf(configId, name).map(({ rank, score, date }) => ({ rank, score, date }));
        },
        // The table's Household Board as the High Score Board gets it: [name, score].
        householdBoard: async (configId) => {
            const { getHighScoreStore } = await import("../../common/high_scores/high_score_store.js");
            return getHighScoreStore().householdBoardOf(configId).map(({ owner, score }) => [owner.name, score]);
        },
        // The User folder's text files from now on ({ name: text }).
        setUserFiles: (texts) => {
            for (const [name, text] of Object.entries(texts)) fake.addFile(userFileOf(name), text);
        },
        // Plays the table as PinballY launches it; VPinMAME saves the board
        // after (raw lines) as the game ends, read as afterRead says
        // (setBoard's options), and VPX saves the VPReg.stg sections
        // afterVpreg and the User folder's text files afterUserFiles
        // ({ name: text }), and VPinMAME the .nv files nvAfter ({ rom:
        // lastGame(...) }); backOnWheel() runs right after "postlaunch",
        // before the reads after the game.
        play: async (configId, { after, afterRead, afterVpreg, afterUserFiles = {}, nvAfter = {}, durationMs = GAME_MS, backOnWheel = () => {} } = {}) => {
            const game = fake.getGameInfo(configId);
            fake.playGame(game);
            await settle();
            fake.gameStarted(game);
            await finishReads();
            fake.advanceTime(Math.max(durationMs - READS_STEPS * 1000, 0));
            await settle();
            if (after) fake.setNvramBoard(configId, after, afterRead);
            if (afterVpreg) fake.addFile(VPREG_PATH, writeCompoundFile(afterVpreg));
            for (const [name, text] of Object.entries(afterUserFiles)) fake.addFile(userFileOf(name), text);
            for (const [rom, text] of Object.entries(nvAfter)) fake.addFile(nvFileOf(rom), text);
            fake.gameOver(game);
            backOnWheel();
            await finishReads();
        },
        pendingTimerCount: () => fake.pendingTimerCount(),
        // Every toast drawn so far, its texts joined with " | ".
        toasts: () => toastDrawings(fake).map(drawing => drawing.texts.join(" | ")),
        // The boards handed to PinballY, in order: { configId, lines }.
        handedBoards: () => fake.highScoreSets().filter(set => set.lines !== null),
        log: () => fake.logLines().filter(line => line.startsWith("[HighScores]")),
        // The anomaly log's lines without their date and time; undefined without the file.
        anomalies: () => {
            const text = fake.readFile(ANOMALY_LOG);
            return text === undefined ? undefined : text.split("\r\n").filter(Boolean).map(line => line.replace(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d /, ""));
        },
        saved: () => {
            const text = fake.readFile(HIGH_SCORES_FILE);
            return text === undefined ? undefined : JSON.parse(text);
        },
    };
}
