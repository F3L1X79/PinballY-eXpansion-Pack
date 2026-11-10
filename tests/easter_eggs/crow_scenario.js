// ============================================================
// Crow tests' scenario: main.js on the fake globals, the Crow's draw always
// won, and what the player sees of it. Never loaded by PinballY; one
// start per test file, as main.js loads once per process.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { winTheDrawOf } from "./winning_draw.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const PROFILES = `${PACK}\\profiles`;
const IMAGES = `${PACK}\\assets\\images\\easter_eggs`;
export const WING_IMAGES = ["crow_wing_up.png", "crow_wing_mid.png", "crow_wing_down.png"].map(file => `${IMAGES}\\${file}`);
export const DOT_IMAGE = `${IMAGES}\\crow_dot.png`;
export const CALL = `${PACK}\\assets\\sounds\\easter_eggs\\raven_call.wav`;
export const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
export const DAILY_FILE = `${PROFILES}\\easter_egg_day.json`;
export const TABLE = {
    id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "", year: 0, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, audioVolume: 100,
};
export const FLIGHT_MS = 9000;
export const CALL_MS = 10200;
// Past the last dot's hold and fade.
export const ALL_GONE_MS = 13000;
// Longer than a toast's whole life (rise, hold, fade).
export const TOAST_LIFE_MS = 6000;

// addOns: the Add-ons turned on; wins: the Easter Egg whose draw wins; files:
// which of the Crow's assets exist; seed(fake): anything else before the start.
export async function startCrowScenario({
    addOns = ["startupChoicePrompt", "profilePicker", "achievements", "sessionStatsTracker"], startupScreen = "welcome", wins = "crow",
    files = [...WING_IMAGES, DOT_IMAGE, CALL], seed = () => {}, profiles = ["Alice", "Bob"],
} = {}) {
    const fake = createFakePinballYHost({ tables: [TABLE], now: new Date(2026, 10, 9, 20, 0, 0) });
    for (const name of profiles) fake.addFolder(`${PROFILES}\\${name}`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Bob" }));
    for (const path of files) fake.addFile(path);
    seed(fake);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = "en";
    config.startupScreen = startupScreen;

    const { default: lang } = await import("../../common/core/i18n.js");
    await winTheDrawOf(wins);
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    return { fake, lang, store: getProfileStore() };
}

const showing = (fake, images) => fake.drawingLayers().filter(layer => layer.alpha > 0 && layer.images().some(image => images.includes(image)));
export const birds = fake => showing(fake, WING_IMAGES);
export const dots = fake => showing(fake, [DOT_IMAGE]);
// Shown or not: none once the Crow has gone.
export const crowLayers = fake => fake.drawingLayers().filter(layer => layer.images().some(image => [...WING_IMAGES, DOT_IMAGE].includes(image)));
export const calls = fake => fake.soundsPlayed().filter(path => path === CALL);
