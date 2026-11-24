// ============================================================
// Wheel Arrival Sound tests' scenario: main.js on the fake globals, with a
// Wheel Arrival sound and a Profile Greeting sound set, and which of them played.
// Never loaded by PinballY; one start per test file, as main.js loads once per process.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS } from "../welcome_screen/welcome_screen_reader.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
export const ARRIVAL_SOUND = "C:\\Sounds\\here-we-go.mp3";
export const GREETING_SOUND = "C:\\Sounds\\hello.mp3";
// Past every fade, greeting and toast that could follow a close.
export const SETTLED_MS = 5000;
export const TABLE = {
    id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "", year: 0, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, audioVolume: 100,
};

// addOns: the Add-ons turned on; soundFile: the WHEEL_ARRIVAL_SOUND_FILE;
// files: the sound files that exist. On the Welcome Screen, it is open on
// return. Bob is active; the carousel lists Alice, Bob, then Guest.
export async function startWheelArrivalSoundScenario({
    addOns = ["startupChoicePrompt", "profilePicker", "wheelArrivalSound"], startupScreen = "welcome",
    soundFile = ARRIVAL_SOUND, files = [ARRIVAL_SOUND, GREETING_SOUND], profiles = ["Alice", "Bob"],
} = {}) {
    const fake = createFakePinballYHost({ tables: [TABLE] });
    for (const name of profiles) fake.addFolder(`${PROFILES}\\${name}`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Bob" }));
    for (const path of files) fake.addFile(path);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = "en";
    config.startupScreen = startupScreen;
    config.wheelArrivalSoundFile = soundFile;
    config.profileGreetingSoundFile = GREETING_SOUND;
    // A Random Game then launches at once.
    config.skipRandomGameAnimation = true;

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    if (startupScreen === "welcome") fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    return { fake, lang, store: getProfileStore() };
}

export const arrivalSounds = fake => fake.soundsPlayed().filter(path => path === ARRIVAL_SOUND);

// The players that played the sound at path, in order.
export function playersOf(fake, path) {
    const players = fake.soundPlayers();
    return fake.soundsPlayed().flatMap((played, index) => (played === path ? [players[index]] : []));
}
