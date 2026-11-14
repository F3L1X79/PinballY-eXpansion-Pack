// ============================================================
// The Wheel Order tests' restart: main.js on the fake host with cabinet.json
// as the last session left it and the filter PinballY restored, the Startup
// Screen picked and closed at a hurried player's pace. Never loaded by PinballY.
// ============================================================

import { startOnProfilePicker, CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";
import { press, WELCOME_SCREEN_FADE_IN_MS } from "../welcome_screen/welcome_screen_reader.js";

export const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const HURRIED_PICK_MS = 1000;
export const COPY_ID = "User.project.WheelOrder";

const table = (title, year) => ({ id: title, configId: title, title, year, manufacturer: "Williams", isConfigured: true });
// Out of every order on purpose: the wheel is read as the Add-on leaves it.
const TABLES = [
    table("Medieval Madness", 1997),
    table("Space Trip", undefined),
    table("Black Knight", 1980),
    table("Attack from Mars", 1995),
    table("Gorgar", 1979),
    table("Eight Ball", 1977),
    table("Cirqus Voltaire", 1997),
];

// cabinet: the Wheel Order's keys in cabinet.json; restored: the filter
// PinballY restored and its wheel, before the scripts run.
export async function restart({ cabinet, restored: { filterId, wheel } }) {
    const { fake, lang, settle } = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "customMenuCommands", "wheelOrder", "tablesToDiscover"],
        tables: TABLES,
        now: new Date(2026, 10, 14, 20, 0, 0),
        seed: (seeded) => {
            seeded.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "Bob", ...cabinet }));
            seeded.setWheelTables(wheel, { filterId });
        },
    });
    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS + HURRIED_PICK_MS);
    await settle();
    press(fake, "Select");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_FADE_IN_MS * 2);
    press(fake, "Exit");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    return { fake, lang };
}

// The wheel read from a known first table: the order, whatever the selection.
export function orderFrom(fake, first) {
    const titles = fake.getWheelTables().map(game => game.title);
    const start = titles.indexOf(first);
    return [...titles.slice(start), ...titles.slice(0, start)];
}

// The main menu's "Active filter: ..." entry, as the player reads it.
export function activeFilterEntry(fake, lang) {
    fake.openMainMenu();
    const prefix = lang.customMenuLabels.activeFilter("");
    const entry = fake.currentMenu().items.find(item => String(item.title).startsWith(prefix));
    while (fake.currentMenu()) fake.pressExitInMenu();
    return entry ? entry.title : null;
}
