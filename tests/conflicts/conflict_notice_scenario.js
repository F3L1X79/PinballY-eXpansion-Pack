// ============================================================
// Conflict Notice tests' start: main.js on the fake host, on the wheel, with
// Drawn Menus, the Profile picker and the Launch overlay (or not), and an
// External Add-on: a listener registered before the pack that cancels
// "launchoverlayshow". Plays a table and reads the Notice. Never loaded by PinballY.
// ============================================================

import { execFileSync } from "node:child_process";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { answer, shownDialog, UPDATE_STATE_FILE } from "../table_roms/script_reader_prompt_scenario.js";
import { PROFILES_FOLDER } from "../table_roms/table_roms_scenario.js";

const INFO_LOG = PROFILES_FOLDER.replace(/profiles$/, "logs\\info.log");

export { answer, shownDialog, UPDATE_STATE_FILE };
export const NOTICE_TITLE = "Launch screen conflict";
export const TURN_OFF = "Turn off Launch overlay";
export const NOTICE_MESSAGE = "Another script took the launch screen before the pack's Launch overlay. "
    + "To keep only the pack's, remove that script's import line from Scripts\\main.js.";
const TABLES = [{ configId: "afm", title: "Attack from Mars" }];

// The Info Log's lines of a Conflict seen happen.
export const conflictLines = fake => (fake.readFile(INFO_LOG) ?? "").split(/\r?\n/).filter(line => line.includes("[ConflictNotice] Conflict \""));

// adminProfiles: the Household's Admin Profiles, among Alice and Bob;
// activeProfile: the one on the wheel; launchOverlay: whether the Add-on is on;
// externalAddOn: whether another script cancels the launch screen before the
// pack; seed(fake): anything else on disk.
export async function startOnWheelWithLaunchScript({
    adminProfiles = ["Alice"], activeProfile = "Alice", launchOverlay = true, externalAddOn = true, seed = () => {},
} = {}) {
    const start = await startOnProfilePicker({
        addOns: ["profilePicker", "drawnMenus", ...(launchOverlay ? ["seamlessLaunchOverlay"] : [])],
        activeProfile,
        tables: TABLES,
        settings: { startupScreen: "wheel" },
        seed: f => {
            for (const name of adminProfiles) {
                f.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], isAdmin: true }));
            }
            if (externalAddOn) f.on("launchoverlayshow", ev => ev.preventDefault());
            seed(f);
        },
    });
    await start.settle();
    start.fake.advanceTime(OPEN_OVER_MS);
    return start;
}

// A whole game, back to the wheel. Returns whether the Loader showed while
// the table loaded, and the dialog on screen once back.
export async function playATable({ fake, settle }) {
    const game = fake.getAllTables()[0];
    fake.playGame(game);
    const loaderShown = readLoader(fake).shown;
    fake.gameStarted(game);
    fake.gameOver(game);
    await settle();
    fake.advanceTime(OPEN_OVER_MS);
    return { loaderShown, dialog: shownDialog(fake) };
}

// An earlier start, in a child process, where a table is played and the
// Notice gets this answer. Returns the title of the Notice it showed and
// the update state file it left (null when none).
export function answerInAnEarlierStart(choice) {
    return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `
import { startOnWheelWithLaunchScript, playATable, answer, UPDATE_STATE_FILE } from ${JSON.stringify(import.meta.url)};
const start = await startOnWheelWithLaunchScript();
const { dialog } = await playATable(start);
await answer(start, ${JSON.stringify(choice)});
process.stdout.write(JSON.stringify({ title: dialog && dialog.title, stateFile: start.fake.readFile(UPDATE_STATE_FILE) ?? null }));
`], { encoding: "utf8" }));
}
