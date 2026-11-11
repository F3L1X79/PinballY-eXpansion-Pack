// ============================================================
// Starts the pack through main.js on the fake PinballY globals for the
// Achievement List's opening tests: the main menu commands and the
// Achievements on, English texts unless told otherwise, a few tables, Guest with some plays, and
// each layer draw taking drawMs on the clock. The clock stays at startup,
// so nothing of the list is drawn ahead yet. Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { ACHIEVEMENT_LIST_Z_INDEX } from "../../common/achievements/achievement_list.js";
import { DIMMED_WHEEL } from "../../common/drawing/steamball_drawing.js";

const HOUR = 3600;
const GUEST_PROFILE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\guest\\profile.json";
const NAVIGATION_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";

const table = (id, title, manufacturer, year, playCount) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories: [],
    playCount, playTime: playCount * HOUR, lastPlayed: playCount > 0 ? new Date(2026, 8, id) : null, rating: -1, isHidden: false,
});

const TABLES = [
    table(1, "Medieval Madness", "Williams", 1997, 5),
    table(2, "Attack from Mars", "Bally", 1995, 0),
    table(3, "Close Encounters", "Gottlieb", 1978, 1),
];

// The veil the list's opening dims the wheel with, as readVeil() reads it.
export const LIST_VEIL = { shown: true, zIndex: ACHIEVEMENT_LIST_Z_INDEX.backdrop - 2, color: DIMMED_WHEEL };

// language: set in config before the scenario is imported, since its
// imports already read the texts.
export async function startPack({ drawMs = 0, language = "en" } = {}) {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables: TABLES, drawMs });
    fake.addFile(GUEST_PROFILE_FILE, JSON.stringify({ version: 1, notified: [] }));
    for (const path of [NAVIGATION_SOUND, NAVIGATION_SOUND.replace("Next.wav", "Prev.wav")]) fake.addFile(path);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "achievements"].includes(key);
    config.language = language;
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    return { fake, lang };
}

// Opens the main menu and selects the Achievement List entry: the clock
// does not run.
export function startOpeningFromMainMenu(fake, lang) {
    fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
    fake.selectMenuItem(lang.achievementList.menuEntry);
}
