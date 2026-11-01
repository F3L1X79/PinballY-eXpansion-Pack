// ============================================================
// Script Reader Prompt tests' start: main.js on the fake host with Drawn
// Menus, the Profile picker as the Startup Screen and Table ROMs (or not),
// vpxtool missing or installed with a remembered version, over a Household
// whose Admin Profiles the test names; reads the prompt as it opens, then a
// hurried player answers, picks and closes the Welcome Screen. Never loaded by PinballY.
// ============================================================

import { execFileSync } from "node:child_process";
import { DEFAULTS } from "../../common/core/config.js";
import { applyEnvOverrides } from "../../common/core/env_overrides.js";
import { openSettings, DIALOG } from "../settings/install_vpxtool_scenario.js";
import { startOnProfilePicker, isCarouselOpen, CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";
import { readDrawnMenu, drawnMenuLines, isDrawnMenuShown, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { press, WELCOME_SCREEN_FADE_IN_MS } from "../welcome_screen/welcome_screen_reader.js";
import { watchCards } from "../achievements/error_toast_scenario.js";
import { PROFILES_FOLDER, VPXTOOL } from "./table_roms_scenario.js";

export const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
export const UPDATE_STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const SCRIPT_READER_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\script_reader_install.ps1";
// The same Dialog as the Settings' install line.
export const PROMPT = DIALOG;
// What the Table ROMs Add-on logs at each start without vpxtool.
export const MISSING_LOGGED = `[TableRoms] ERROR vpxtool not found at ${VPXTOOL}; the table scripts are not read.`;
// Well before the Table ROMs Add-on's 10 s startup delay.
const HURRIED_PICK_MS = 1000;
// Long enough for a toast to start once nothing holds it.
const ARRIVAL_LIMIT_MS = 5000;

const isErrorCard = card => card.text.startsWith("PROBLEM | ");

// The Drawn Menu on screen as { title, message, lines }, or null.
export function shownDialog(fake) {
    if (!isDrawnMenuShown(fake)) return null;
    const { title, message } = readDrawnMenu(fake);
    return { title, message, lines: drawnMenuLines(fake) };
}

// The vpxtool version a start remembers from an earlier one, as the state file holds it.
export const SCRIPT_READER_STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\script_reader.json";
export const rememberedVersionFile = version => JSON.stringify({ vpxtoolVersion: version, version: 1 });
// What the Table ROMs Add-on's queue reads the version with, past its 10 s startup delay.
export const VERSION_READ_MS = 11 * 1000;
// A vpxtool answering "--version" with versionAnswer ({ output, exitCode,
// durationMs }), any other run with a script that loads no ROM.
export const vpxtoolAnswering = versionAnswer => args => (args[0] === "--version" ? versionAnswer : { output: "" });

// adminProfiles: the Household's Admin Profiles; activeProfile: the last
// active one; tableRoms: whether the Add-on is on; settings: the other
// config values; vpxtool: the installed vpxtool's run (vpxtoolAnswering),
// none when missing; rememberedVersion: the state file's version, or its
// text when not a version; seed(fake): anything else on disk. Returns the
// start, with the dialog shown once its opening is over.
export async function startForScriptReader({
    adminProfiles = [], activeProfile = "Alice", tableRoms = true, settings = {}, vpxtool = null, rememberedVersion = null, seed = () => {},
} = {}) {
    const addOns = ["startupChoicePrompt", "profilePicker", "drawnMenus", ...(tableRoms ? ["tableRoms"] : [])];
    const start = await startOnProfilePicker({
        addOns, activeProfile, settings,
        seed: f => {
            for (const name of adminProfiles) {
                f.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], isAdmin: true }));
            }
            f.addFile(SCRIPT_READER_HELPER, "helper");
            if (vpxtool) f.addProgram(VPXTOOL, vpxtool);
            if (rememberedVersion !== null) {
                f.addFile(SCRIPT_READER_STATE_FILE, /^\d/.test(rememberedVersion) ? rememberedVersionFile(rememberedVersion) : rememberedVersion);
            }
            seed(f);
        },
    });
    await start.settle();
    start.fake.advanceTime(OPEN_OVER_MS);
    return { ...start, dialog: shownDialog(start.fake) };
}

// The prompt's answer: an entry's title, or "Exit" for the Exit button.
export async function answer({ fake, settle }, choice) {
    if (choice === "Exit") press(fake, "Exit");
    else chooseEntry(fake, choice);
    await settle();
}

// A first start, in a child process, where the prompt gets this answer and
// the eXpansion Pack Settings open after it; then the next start, here,
// configured from the .env.local the first left. Returns the first's prompt,
// .env.local (null when none) and Settings lines (the list's, then the
// Offline Mode group's), and the next start.
export async function answerThenRestart(choice) {
    const firstRun = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `
import { startForScriptReader, answer, openSettingsLines, ENV_LOCAL } from ${JSON.stringify(import.meta.url)};
const start = await startForScriptReader();
await answer(start, ${JSON.stringify(choice)});
const settingsLines = openSettingsLines(start.fake);
process.stdout.write(JSON.stringify({ dialog: start.dialog, envLocal: start.fake.readFile(ENV_LOCAL) ?? null, settingsLines }));
`], { encoding: "utf8" }));
    const { config: saved } = applyEnvOverrides(DEFAULTS, firstRun.envLocal);
    const next = await startForScriptReader({
        settings: { offerVpxtool: saved.offerVpxtool },
        seed: f => { if (firstRun.envLocal !== null) f.addFile(ENV_LOCAL, firstRun.envLocal); },
    });
    return { firstRun, next };
}

// The eXpansion Pack Settings' list lines, then the Offline Mode group's,
// opened from the Operator Menu.
export function openSettingsLines(fake) {
    openSettings(fake);
    const list = drawnMenuLines(fake);
    chooseEntry(fake, "Offline Mode");
    fake.advanceTime(OPEN_OVER_MS);
    return { list, offlineMode: drawnMenuLines(fake) };
}

// A hurried player at the Profile picker: picks the highlighted Profile
// as soon as the carousel shows and closes the Welcome Screen. Returns
// whether the carousel was open, and the Error Toasts shown since the start.
export async function pickHurriedly({ fake, lang, settle }) {
    fake.advanceTime(CAROUSEL_OPEN_MS + OPEN_OVER_MS);
    const carouselOpen = isCarouselOpen(fake, lang);
    fake.advanceTime(HURRIED_PICK_MS);
    press(fake, "Select");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_FADE_IN_MS * 2);
    press(fake, "Exit");
    await settle();
    fake.advanceTime(ARRIVAL_LIMIT_MS);
    return { carouselOpen, errorCards: watchCards(fake).filter(isErrorCard) };
}
