// ============================================================
// Starts main.js on the fake host with the Profile picker alone, opens the
// carousel, and reads the "+" slot and Name Entry as the player sees them.
// Never loaded by PinballY; one start per test file, as main.js loads once
// per process.
// ============================================================

import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { shownLayers } from "../support/shown_layers.js";
import { layerUnderMarker } from "../support/selection_marker_reader.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { NAME_ENTRY_Z_INDEX as Z } from "../../common/profiles/name_entry_painter.js";
import config from "../../common/core/config.js";

export const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const ERASE_ARROW = String.fromCharCode(0x2190);
// The carousel's background, its Avatars, then the gold frame and names.
const PICKER_Z_RANGE = [6500, 6502];
// Past the startup greeting and the drawing ahead.
const SETTLED_MS = 3000;
export const GLIDE_OVER_MS = 500;
// Past Name Entry's opening: its pieces drawn, then its fade in.
export const NAME_ENTRY_OPEN_MS = 600;

const markedProfile = marks => JSON.stringify({ version: 1, plays: {}, notified: [], ...marks });

// profiles: the Household's folders; admins, children: those of them marked.
export async function startOnWheel({ profiles = ["Alice", "Bob"], admins = [], children = [], activeProfile = "Bob", language = "en", fakeOptions = {} } = {}) {
    const fake = createFakePinballYHost(fakeOptions);
    for (const name of profiles) fake.addFolder(`${PROFILES_FOLDER}\\${name}`);
    for (const name of admins) fake.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, markedProfile({ isAdmin: true }));
    for (const name of children) fake.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, markedProfile({ isChild: true }));
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile }));
    fake.addFile("C:\\PinballY\\Assets\\Button Sounds\\Next.wav");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "profilePicker";
    config.language = language;
    config.startupScreen = "wheel";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(SETTLED_MS);

    const openPicker = async () => {
        fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
        fake.selectMenuItem(lang.profiles.menuEntry);
        await settle();
    };
    return { fake, lang, store: getProfileStore(), openPicker };
}

export const press = (fake, command, repeat = false) => fake.fire("commandbuttondown", { command, repeat });

export const pickerTexts = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex >= PICKER_Z_RANGE[0] && layer.zIndex <= PICKER_Z_RANGE[1] && layer.alpha > 0)
    .flatMap(layer => layer.texts());

// The name shown under the highlighted slot, given the names it may be.
export function highlighted(fake, candidates) {
    const shown = candidates.filter(name => pickerTexts(fake).includes(name));
    assert.equal(shown.length, 1, `exactly one of ${candidates.join(", ")} is shown, got ${shown.join(", ")}`);
    return shown[0];
}

// One step along the carousel, at rest once it returns.
export function step(fake, command) {
    press(fake, command);
    fake.advanceTime(GLIDE_OVER_MS);
}

export const isNameEntryOpen = fake => shownLayers(fake, Z.backdrop).length > 0;
export const nameEntryTexts = fake => shownLayers(fake, Z.texts).flatMap(layer => layer.texts());
export const nameShown = fake => shownLayers(fake, Z.name).flatMap(layer => layer.texts()).join("");
export const reasonShown = fake => shownLayers(fake, Z.reason).flatMap(layer => layer.texts()).join("");
export const ringLayers = fake => shownLayers(fake, Z.ring);
const xOf = layer => layer.position().x;
// The characters shown on the strip, left to right.
export const ringShown = fake => [...ringLayers(fake)].sort((a, b) => xOf(a) - xOf(b)).map(layer => layer.texts()[0]);

// The character the Selection Marker surrounds.
export function currentCharacter(fake) {
    const layer = layerUnderMarker(fake, Z.marker, ringLayers(fake));
    assert.ok(layer, "the Selection Marker surrounds a character");
    return layer.texts()[0];
}

// The colour of a character on the strip.
export function colorOf(fake, character) {
    const layer = ringLayers(fake).find(candidate => candidate.texts()[0] === character);
    assert.ok(layer, `${character} shows on the strip`);
    return layer.strokes().find(stroke => stroke.text === character).color;
}

// Moves along the ring with Next to the character.
export function moveTo(fake, character) {
    for (let moves = 0; currentCharacter(fake) !== character; moves++) {
        assert.ok(moves < 60, `${character} is on the ring`);
        press(fake, "Next");
    }
}

export function enter(fake, character) {
    moveTo(fake, character);
    press(fake, "Select");
}

export function enterName(fake, name) {
    for (const character of name) enter(fake, character);
}

// Erases the whole name with the arrow.
export function eraseName(fake) {
    moveTo(fake, ERASE_ARROW);
    while (nameShown(fake) !== "") press(fake, "Select");
}

// Enters the name, finds it refused for that reason with OK greyed and doing nothing, and erases it.
export function assertRefused(fake, name, reason) {
    enterName(fake, name);
    assert.equal(reasonShown(fake), reason, name);
    moveTo(fake, "OK");
    assert.equal(colorOf(fake, "OK"), STEAMBALL_COLORS.dim, `OK is greyed on ${name}`);
    press(fake, "Select");
    assert.equal(isNameEntryOpen(fake), true, `OK does nothing on ${name}`);
    eraseName(fake);
    assert.equal(reasonShown(fake), "", "an empty name shows no reason");
}

// Opens Name Entry from the highlighted "+".
export function openNameEntry(fake) {
    press(fake, "Select");
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
    assert.equal(isNameEntryOpen(fake), true, "Name Entry opens");
}
