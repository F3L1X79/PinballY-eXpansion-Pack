// ============================================================
// Import order tests' start: main.js on the fake host, on the wheel, with
// the owner's Scripts\main.js as given (or none), and an Admin Profile.
// Reads the Conflict Notice the startup check submits. Never loaded by PinballY.
// ============================================================

import { execFileSync } from "node:child_process";
import { startOnWheelWithLaunchScript, shownDialog, answer, conflictLines, SCRIPTS_FOLDER, UPDATE_STATE_FILE } from "./conflict_notice_scenario.js";

export { shownDialog, answer, conflictLines, UPDATE_STATE_FILE };
const INFO_LOG = "C:\\PinballY\\Scripts\\ExpansionPack\\logs\\info.log";
const infoLogLines = (fake, start) => (fake.readFile(INFO_LOG) ?? "").split(/\r?\n/).filter(line => line.includes(`[ConflictNotice] ${start}`));
// The Info Log's lines of an import after the pack's line, and of an import order not checked.
export const importOrderLines = fake => infoLogLines(fake, "Import order: ");
export const notCheckedLines = fake => infoLogLines(fake, "Import order not checked");
export const OWNER_MAIN = `${SCRIPTS_FOLDER}\\main.js`;
export const PACK_LINE = "import(\"./ExpansionPack/main.js\").catch(e => logfile.log(\"ExpansionPack: \" + e.message));";
export const IMPORT_ORDER_TITLE = "The pack's line is not the last";
export const IMPORT_ORDER_MESSAGE = "Scripts\\main.js imports another script after the pack, "
    + "so the pack cannot see what that script does. Move the pack's import line to the end of the file.";

// ownerMain: the lines of Scripts\main.js, or null for no file; stateFile:
// the update state an earlier start left, or null.
export async function startWithOwnerMain(ownerMain, { stateFile = null, ...options } = {}) {
    return startOnWheelWithLaunchScript({
        externalAddOn: false,
        ...options,
        seed: f => {
            if (ownerMain !== null) f.addFile(OWNER_MAIN, ownerMain.join("\r\n"));
            if (stateFile !== null) f.addFile(UPDATE_STATE_FILE, stateFile);
        },
    });
}

// A later start, in a child process, with the update state file an earlier
// one left. Returns the title of the dialog it shows, or null.
export function titleAtALaterStart(ownerMain, stateFile) {
    return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `
import { startWithOwnerMain, shownDialog } from ${JSON.stringify(import.meta.url)};
const start = await startWithOwnerMain(${JSON.stringify(ownerMain)}, { stateFile: ${JSON.stringify(stateFile)} });
const dialog = shownDialog(start.fake);
process.stdout.write(JSON.stringify(dialog && dialog.title));
`], { encoding: "utf8" }));
}
