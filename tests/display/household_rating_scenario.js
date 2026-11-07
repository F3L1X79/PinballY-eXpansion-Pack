// ============================================================
// Household Rating tests' scenario: main.js on the fake globals with Profiles
// whose ratings.json already holds their Ratings, the active one's on
// PinballY's columns. Reads the Household Rating message, the last one of the
// lower status line. Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";

const NOW = new Date(2026, 10, 7, 20, 0, 0);
const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

const table = (id, title, manufacturer, year) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isFavorite: false, isHidden: false,
});
// Medieval Madness is selected at startup: second alphabetically, after Attack from Mars.
export const TABLES = [
    table(1, "Medieval Madness", "Williams", 1997),
    table(2, "Attack from Mars", "Bally", 1995),
    table(3, "Theatre of Magic", "Bally", 1995),
];
export const [MEDIEVAL, MARS] = TABLES;
export const MEDIEVAL_POSITION = 2;

// ratings: { profileName: { configId: rating } }, the active Profile's put on
// PinballY's columns; children: Child Profiles; addOns: the Add-ons on;
// files: { path: text } replacing or adding Profiles' files; firstRun: no
// Ratings file and no cabinet record yet, Profile Ratings' first run.
export async function startScenario({
    ratings, active = "guest", children = [], addOns = ["statusLineInfo", "profileRatings", "profilePicker"],
    language = "en", files = {}, firstRun = false,
}) {
    const tables = TABLES.map(game => ({ ...game, rating: (ratings[active] || {})[game.configId] ?? -1 }));
    const fake = createFakePinballYHost({ now: NOW, tables });
    for (const [name, values] of Object.entries(ratings)) {
        fake.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, JSON.stringify({
            version: 1, plays: {}, notified: [], ...(children.includes(name) ? { isChild: true } : {}),
        }));
        if (!firstRun) {
            fake.addFile(`${PROFILES_FOLDER}\\${name}\\ratings.json`, JSON.stringify({ version: 1, ratings: values, favorites: [] }));
        }
    }
    for (const [path, text] of Object.entries(files)) fake.addFile(`${PROFILES_FOLDER}\\${path}`, text);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: active }));
    if (!firstRun) {
        fake.addFile(`${PROFILES_FOLDER}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: active }));
    }
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = language;
    config.startupScreen = "welcome";

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    return { fake, TEXT: lang.tableInfoStatusLines };
}

export const lastLowerMessage = fake => fake.lowerStatusLine().at(-1);

// The player moves the wheel onto this table.
export function select(fake, game) {
    const offset = fake.getWheelTables().findIndex(candidate => candidate.configId === game.configId);
    fake.moveWheel(offset);
}

// The player rates the selected table in PinballY's dialog, which then closes.
export async function rate(fake, game, rating) {
    fake.getGameInfo(game.configId).update({ rating });
    fake.fire("popupclose", { id: "rate game" });
    await settle();
}

export async function switchTo(name) {
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    getProfileStore().switchTo(name);
    await settle();
}
