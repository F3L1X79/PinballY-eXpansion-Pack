// ============================================================
// Starts main.js on the fake host with the default Startup Screen, the
// Profile picker, and reads its carousel as the player sees it. Never loaded by
// PinballY; one start per test file, as main.js loads once per process.
// ============================================================

import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// The carousel's background, its Avatars, then the gold frame and names.
const PICKER_Z_RANGE = [6500, 6502];

// Past the carousel's opening, on its turn a tick after the start, and the
// glide between two Avatars.
export const CAROUSEL_OPEN_MS = 100;
export const GLIDE_OVER_MS = 500;

// addOns: the Add-ons turned on; profiles: the Household's folders;
// childProfiles: those of them marked as Child Profiles; tables: the
// wheel's, as the fake host takes them; settings: the other config values;
// files: the paths present on disk (sounds); layoutSize: the window's at
// the start, viewSizeAtInit: the view's during the scripts' init, now: the
// time at the start, pinballYVersion: the running version (all four as the
// fake host takes them); seed(fake): anything else to prepare before the start.
export async function startOnProfilePicker({
    addOns = ["startupChoicePrompt", "profilePicker"], profiles = ["Alice", "Bob"], childProfiles = [], activeProfile = "Bob", tables, settings = {}, files = [],
    layoutSize, viewSizeAtInit, now, pinballYVersion, seed = () => {},
} = {}) {
    const fake = createFakePinballYHost({
        ...(tables ? { tables } : {}), ...(layoutSize ? { layoutSize } : {}), ...(viewSizeAtInit ? { viewSizeAtInit } : {}),
        ...(now ? { now } : {}), ...(pinballYVersion ? { pinballYVersion } : {}),
    });
    for (const name of profiles) fake.addFolder(`${PROFILES_FOLDER}\\${name}`);
    for (const name of childProfiles) {
        fake.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], isChild: true }));
    }
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile }));
    for (const path of files) fake.addFile(path);
    seed(fake);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = "en";
    Object.assign(config, settings);

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const { getAchievementToasts } = await import("../../common/achievements/achievement_toast.js");
    await import("../../main.js");
    return { fake, lang, store: getProfileStore(), toasts: getAchievementToasts(), settle };
}

// A Profile picker sound present on disk, and what it played so far.
export const PICKER_SOUND = "C:\\Sounds\\choose-your-character.mp3";
export const pickerSounds = fake => fake.soundsPlayed().filter(path => path === PICKER_SOUND);

// What the picker's layers show now, the toasts' drawings left out.
export const pickerTexts = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex >= PICKER_Z_RANGE[0] && layer.zIndex <= PICKER_Z_RANGE[1] && layer.alpha > 0)
    .flatMap(layer => layer.texts());

// Whether the carousel shows: its title on screen.
export const isCarouselOpen = (fake, lang) => pickerTexts(fake).includes(lang.profiles.pickerTitle);

// The one Profile name shown (only the highlighted Avatar is named).
export function highlightedName(fake, names) {
    const shown = names.filter(name => pickerTexts(fake).includes(name));
    assert.equal(shown.length, 1, `exactly one name among ${names.join(", ")} is shown`);
    return shown[0];
}
