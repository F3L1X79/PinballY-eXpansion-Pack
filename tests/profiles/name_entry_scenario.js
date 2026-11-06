// ============================================================
// Starts main.js on the fake host with the Profile picker alone, opens the
// carousel, and reads the "+" slot, Name Entry and Avatar Choice as the
// player sees them, the pack's portraits seeded.
// Never loaded by PinballY; one start per test file, as main.js loads once
// per process.
// ============================================================

import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { shownLayers } from "../support/shown_layers.js";
import { layerUnderMarker } from "../support/selection_marker_reader.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { NAME_ENTRY_Z_INDEX as Z } from "../../common/profiles/name_entry_painter.js";
import { AVATAR_CHOICE_Z_INDEX as AVATAR_Z } from "../../common/profiles/avatar_choice_painter.js";
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
// Past Avatar Choice's opening: its portraits drawn, then its fade in.
export const AVATAR_CHOICE_OPEN_MS = 1000;
const PICKER_AVATAR_Z_INDEX = 6501;

const markedProfile = marks => JSON.stringify({ version: 1, plays: {}, notified: [], ...marks });

// The pack's portraits of Avatar Choice, by number (1 for avatar_choice_01.png).
export const PORTRAIT_COUNT = 24;
export const portraitOf = number => `C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\avatar_choice\\avatar_choice_${String(number).padStart(2, "0")}.png`;

// profiles: the Household's folders; admins, children: those of them marked.
export async function startOnWheel({ profiles = ["Alice", "Bob"], admins = [], children = [], activeProfile = "Bob", language = "en", fakeOptions = {} } = {}) {
    const fake = createFakePinballYHost(fakeOptions);
    for (let number = 1; number <= PORTRAIT_COUNT; number++) fake.addFile(portraitOf(number), `portrait ${number}`);
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

// Avatar Choice, which opens once Name Entry's OK created the Profile.
export const isAvatarChoiceOpen = fake => shownLayers(fake, AVATAR_Z.backdrop).length > 0;
export const avatarChoiceTexts = fake => shownLayers(fake, AVATAR_Z.texts).flatMap(layer => layer.texts());
export const portraitLayers = fake => shownLayers(fake, AVATAR_Z.portraits);
// The portrait's path the Selection Marker surrounds, or "exit" on the Exit Button.
export function currentPortrait(fake) {
    const exitButton = shownLayers(fake, AVATAR_Z.exitButton);
    const layer = layerUnderMarker(fake, AVATAR_Z.marker, [...portraitLayers(fake), ...exitButton]);
    assert.ok(layer, "the Selection Marker surrounds a portrait or the Exit Button");
    return exitButton.includes(layer) ? "exit" : layer.images()[0];
}

// Avatar Choice's confirmation, which Exit shows over the grid.
export const isConfirmationOpen = fake => shownLayers(fake, AVATAR_Z.confirmationPanel).length > 0;
export const confirmationTexts = fake => shownLayers(fake, AVATAR_Z.confirmationPanel).flatMap(layer => layer.texts());
export const confirmationChoices = fake => shownLayers(fake, AVATAR_Z.confirmationChoices).flatMap(layer => layer.texts());
// The confirmation's choice the Selection Marker surrounds.
export function currentConfirmationChoice(fake) {
    const layer = layerUnderMarker(fake, AVATAR_Z.confirmationMarker, shownLayers(fake, AVATAR_Z.confirmationChoices));
    assert.ok(layer, "the Selection Marker surrounds a choice of the confirmation");
    return layer.texts()[0];
}

// Exit, then the confirmation's second choice, "Keep the default Avatar".
export function keepDefaultAvatar(fake) {
    press(fake, "Exit");
    assert.equal(isConfirmationOpen(fake), true, "Exit asks to confirm");
    press(fake, "Next");
    assert.equal(currentConfirmationChoice(fake), confirmationChoices(fake)[1]);
    press(fake, "Select");
    assert.equal(isAvatarChoiceOpen(fake), false, "keeping the Default Avatar leaves Avatar Choice");
}

// After a successful OK: lets Avatar Choice open, then leaves it keeping
// the Default Avatar.
export function passThroughAvatarChoice(fake) {
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), true, "Avatar Choice opens after OK");
    keepDefaultAvatar(fake);
}

// Enters the name, chooses OK and lets Avatar Choice open.
export function createThroughNameEntry(fake, name) {
    enterName(fake, name);
    moveTo(fake, "OK");
    press(fake, "Select");
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
}

// The Avatar images the carousel shows.
export const pickerAvatars = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex === PICKER_AVATAR_Z_INDEX && layer.alpha > 0)
    .flatMap(layer => layer.images());
