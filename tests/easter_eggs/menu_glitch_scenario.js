// ============================================================
// Menu Glitch tests' scenario: main.js on the fake globals, the Menu Glitch's
// draw always won, past the startup, and what the player sees of it.
// Never loaded by PinballY; one start per test file.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { winTheDrawOf } from "./winning_draw.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const PROFILES = `${PACK}\\profiles`;
export const GLITCH_SOUND = `${PACK}\\assets\\sounds\\easter_eggs\\distorted_echo.wav`;
export const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
export const TABLE = {
    id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "", year: 0, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, audioVolume: 100,
};
export const LEAD_IN_MS = 400;
export const SOUND_STARTS_MS = 20;
export const EFFECT_MS = 3000;
export const CLIMB_MS = 2500;
// Above the Drawn Menu's glass, under the toasts.
const GLITCH_Z = { first: 6210, last: 6299 };

// Alice is the active Profile: her name backwards reads differently.
export async function startMenuGlitchScenario({ addOns = ["drawnMenus", "achievements", "sessionStatsTracker"], files = [GLITCH_SOUND], random = null } = {}) {
    const fake = createFakePinballYHost({ tables: [TABLE], now: new Date(2026, 10, 9, 20, 0, 0) });
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    for (const path of files) fake.addFile(path);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key) || key === "profilePicker";
    config.language = "en";
    config.startupScreen = "wheel";

    const { default: lang } = await import("../../common/core/i18n.js");
    await winTheDrawOf("menuGlitch");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    // Past the Profile Greeting and the sounds' loading.
    fake.advanceTime(10000);
    await settle();
    if (random) fake.random = random;
    return { fake, lang, store: getProfileStore() };
}

export const glitchLayers = fake => fake.drawingLayers().filter(layer => layer.zIndex >= GLITCH_Z.first && layer.zIndex <= GLITCH_Z.last);
export const shownGlitchLayers = fake => glitchLayers(fake).filter(layer => layer.alpha > 0);
export const shownGlitchTexts = fake => shownGlitchLayers(fake).flatMap(layer => layer.texts());
export const allGlitchTexts = fake => glitchLayers(fake).flatMap(layer => layer.texts());
export const glitchSounds = fake => fake.soundsPlayed().filter(path => path === GLITCH_SOUND);
export const volumes = fake => fake.gameUpdates().map(update => update.changes.audioVolume);
