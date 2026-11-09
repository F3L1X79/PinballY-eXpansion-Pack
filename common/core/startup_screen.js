// ============================================================
// Startup Screen: turns the startupScreen setting, the Add-ons turned on
// and the Household into the first screen PinballY shows, through the
// chain Profile picker -> Welcome Screen -> wheel; the first read writes
// each fallback to the PinballY log, once. Also relays the startup Profile
// picker's close to the Welcome Screen, which follows it.
// - A Household under two Profiles skips the Profile picker without being logged: it is no misconfiguration.
// ============================================================

import config from "./config.js";
import { createPinballYHost } from "./pinbally_host.js";
import { getProfileStore } from "../profiles/profile_store.js";

export const STARTUP_SCREEN = Object.freeze({
    PROFILE_PICKER: "profilePicker",
    WELCOME: "welcome",
    WHEEL: "wheel",
});

const ACCEPTED = [STARTUP_SCREEN.WELCOME, STARTUP_SCREEN.PROFILE_PICKER, STARTUP_SCREEN.WHEEL];
// From the Profile picker on, each screen with the Add-on that shows it.
const CHAIN = [
    { screen: STARTUP_SCREEN.PROFILE_PICKER, addOn: "profilePicker", name: "Profile picker" },
    { screen: STARTUP_SCREEN.WELCOME, addOn: "startupChoicePrompt", name: "Welcome Screen" },
];

// The screen PinballY starts on. householdHasFewerThanTwoProfiles
// is only asked when the Profile picker would open.
export function resolveStartupScreen(host, { setting, addOns, householdHasFewerThanTwoProfiles }) {
    let screen = setting;
    if (!ACCEPTED.includes(screen)) {
        host.log(`[Config] startupScreen "${setting}" is not one of ${ACCEPTED.join(", ")}; starting on the Profile picker.`);
        screen = STARTUP_SCREEN.PROFILE_PICKER;
    }
    for (let index = CHAIN.findIndex(step => step.screen === screen); index >= 0 && index < CHAIN.length; index++) {
        const step = CHAIN[index];
        const next = CHAIN[index + 1] ? CHAIN[index + 1].screen : STARTUP_SCREEN.WHEEL;
        if (addOns[step.addOn] === false) {
            host.log(`[Startup] The ${step.name} Add-on is off; the Startup Screen falls back to "${next}".`);
        } else if (step.screen !== STARTUP_SCREEN.PROFILE_PICKER || !householdHasFewerThanTwoProfiles()) {
            return step.screen;
        }
        screen = next;
    }
    return screen;
}

const pickerDoneListeners = [];

// listener: runs when the startup Profile picker closes on a pick or Exit,
// before any switch; never when attract mode or a game drops it.
export function onStartupPickerDone(listener) {
    pickerDoneListeners.push(listener);
}

export function notifyStartupPickerDone() {
    for (const listener of pickerDoneListeners) listener();
}

const screenClosedListeners = [];

// listener: runs when the Startup Screen hands the wheel over to the player:
// the startup Welcome Screen closes on Exit or Stay, or the Profile Greeting
// that replaces it ends. Never for a reopened screen, a launch or attract mode.
export function onStartupScreenClosed(listener) {
    screenClosedListeners.push(listener);
}

export function notifyStartupScreenClosed() {
    for (const listener of screenClosedListeners) listener();
}

let sharedStartupScreen = null;

// Resolved on the first call, after main.js restored the active Profile.
export function getStartupScreen() {
    if (sharedStartupScreen === null) {
        const store = getProfileStore();
        sharedStartupScreen = resolveStartupScreen(createPinballYHost(), {
            setting: config.startupScreen,
            addOns: config.addOns,
            householdHasFewerThanTwoProfiles: () => store.listProfiles().filter(profile => !profile.isGuest).length < 2,
        });
    }
    return sharedStartupScreen;
}
