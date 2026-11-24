// ============================================================
// Startup Screen: turns the startupScreen setting, the Add-ons turned on
// and the Household into the first screen PinballY shows, through the
// chain Profile picker -> Welcome Screen -> wheel; the first read writes
// each fallback to the PinballY log, once. Relays the startup Profile
// picker's close to the Welcome Screen, and signals the Wheel Arrival.
// - A Household under two Profiles skips the Profile picker without being logged: it is no misconfiguration.
// - Change Player from the startup Welcome Screen carries the chain on: the next Welcome Screen, or the picker's close.
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

const wheelArrivalListeners = [];

// listener: runs at the Wheel Arrival, when the Startup Screen hands the wheel
// over to the player: the startup Welcome Screen closes on Exit or Stay, the
// Profile Greeting that replaces it ends, or the Profile picker opened from it
// by Change Player closes with no Welcome Screen to follow. Never for a
// reopened screen, a launch or attract mode.
export function onWheelArrival(listener) {
    wheelArrivalListeners.push(listener);
}

export function notifyWheelArrival() {
    for (const listener of wheelArrivalListeners) listener();
}

// False on the bare wheel with no Profile Greeting to wait for: no Wheel
// Arrival will come, and onWheelArrival never runs.
export const isWheelArrivalAhead = () => getStartupScreen() !== STARTUP_SCREEN.WHEEL || config.addOns.profilePicker !== false;

// True from the startup Welcome Screen left for Change Player until the
// chain ends, or the Welcome Screen that welcomes the Profile picked has its turn.
let isChainInChangePlayer = false;

// The startup Welcome Screen closed for Change Player: the chain goes on
// through the Profile picker it opens.
export function continueStartupChainInChangePlayer() {
    isChainInChangePlayer = true;
}

// A Welcome Screen at its turn: true once, if it is the one that carries the
// startup chain on after Change Player.
export function takeStartupChainFromChangePlayer() {
    const was = isChainInChangePlayer;
    isChainInChangePlayer = false;
    return was;
}

// Ends the startup chain gone through Change Player, if any: with the Wheel
// Arrival when arrive (the wheel is the player's), without on a launch or attract mode.
export function endStartupChainInChangePlayer({ arrive }) {
    if (takeStartupChainFromChangePlayer() && arrive) notifyWheelArrival();
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
