// ============================================================
// PinballY Version Notice tests' start: main.js on the fake host with Drawn
// Menus and the Profile picker as the Startup Screen, on a PinballY newer than
// the Tested PinballY Version, a newer Pack Version remembered, so the Update
// Prompt is on screen when it returns. Never loaded by PinballY.
// ============================================================

import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { UPDATE_STATE_FILE } from "../table_roms/script_reader_prompt_scenario.js";

const BETA_11 = { display: "1.1.0 (Beta 11)", semantic: "1.1.0-beta.11+10200.20260114T1200", build: 10200, status: "1.1.0" };
const PACK_UPDATE_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\pack_update.ps1";
export const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};

// seed(fake): anything else to prepare before the start.
export async function startOnUpdatePrompt({ seed = () => {} } = {}) {
    const start = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "drawnMenus"],
        activeProfile: "Alice",
        pinballYVersion: BETA_11,
        seed: f => {
            f.addFile(UPDATE_STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE }));
            f.addFile(PACK_UPDATE_HELPER, "helper");
            seed(f);
        },
    });
    await start.settle();
    start.fake.advanceTime(OPEN_OVER_MS);
    return start;
}
