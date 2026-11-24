// ============================================================
// Wheel Arrival tests' scenario: main.js on the fake globals, starting on the
// Welcome Screen with the Profile picker on, counting each Wheel Arrival.
// Never loaded by PinballY; one start per test file, as main.js loads once per process.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS, choose } from "../welcome_screen/welcome_screen_reader.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
export const TABLE = {
    id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "", year: 0, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, audioVolume: 100,
};

// arrivals() reads how many Wheel Arrivals fired so far. Bob is active; the
// carousel lists Alice, Bob, then Guest.
export async function startWheelArrivalScenario({ addOns = ["startupChoicePrompt", "profilePicker"] } = {}) {
    const fake = createFakePinballYHost({ tables: [TABLE] });
    for (const name of ["Alice", "Bob"]) fake.addFolder(`${PROFILES}\\${name}`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Bob" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = "en";
    config.startupScreen = "welcome";
    // A Random Game then launches at once.
    config.skipRandomGameAnimation = true;

    const { default: lang } = await import("../../common/core/i18n.js");
    const { onWheelArrival } = await import("../../common/core/startup_screen.js");
    let count = 0;
    onWheelArrival(() => { count += 1; });
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    return { fake, lang, store: getProfileStore(), arrivals: () => count };
}

// Change Player on the open Welcome Screen: the carousel opens on the active Profile.
export async function chooseChangePlayer(fake, lang) {
    choose(fake, lang.profiles.menuEntry);
    await settle();
}
