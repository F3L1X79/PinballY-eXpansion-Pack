// ============================================================
// Avatar Choice through main.js: Name Entry's OK opens it on the 24
// portraits; the flippers move only the Selection Marker, held or not,
// looping through the Exit Button; the press that closed Name Entry and a
// held Select do nothing; Launch takes a portrait at once, as avatar.png,
// and the picker comes back on the new Profile wearing it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { expectedButtonHints, buttonHintsOn } from "../support/button_hints_reader.js";
import { AVATAR_CHOICE_Z_INDEX } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, isNameEntryOpen, enterName, moveTo, pickerTexts, pickerAvatars,
    isAvatarChoiceOpen, avatarChoiceTexts, portraitLayers, currentPortrait, portraitOf, PROFILES_FOLDER, PORTRAIT_COUNT, AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";

test("a portrait taken on Avatar Choice becomes the new Profile's Avatar in the picker", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice", "Zed"], activeProfile: "Zed" });
    const label = lang.profiles.newProfile;
    const names = () => [lang.profiles.guestName, "Alice", "Maxx", "Zed", label];
    const avatarPath = `${PROFILES_FOLDER}\\Maxx\\avatar.png`;

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    enterName(fake, "Maxx");
    moveTo(fake, "OK");
    const okPress = press(fake, "Select");
    assert.equal(okPress.defaultPrevented, true);
    assert.equal(isNameEntryOpen(fake), false, "OK closes Name Entry");
    assert.ok(store.listProfiles().some(profile => profile.name === "Maxx"), "the Profile is created first");
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), true, "Avatar Choice opens");
    assert.ok(fake.logLines().some(line => line.startsWith("[AvatarChoice] Opened Maxx's in")), "through the shared opening");

    // What the screen shows.
    assert.deepEqual(avatarChoiceTexts(fake), [lang.profiles.avatarChoice.title, "Maxx", lang.profiles.avatarChoice.line]);
    assert.equal(lang.profiles.avatarChoice.title, "Choose your Avatar");
    assert.deepEqual(portraitLayers(fake).map(layer => layer.images()[0]), Array.from({ length: PORTRAIT_COUNT }, (_, index) => portraitOf(index + 1)));
    assert.deepEqual(buttonHintsOn(fake, AVATAR_CHOICE_Z_INDEX.buttonHints), expectedButtonHints(lang, { exit: "back" }));
    assert.equal(fake.files.fileExists(avatarPath), false, "the press that closed Name Entry takes nothing");
    assert.equal(currentPortrait(fake), portraitOf(1), "the marker starts on the first portrait");

    // Moving only moves the marker, through the Exit Button and back.
    const drawingsBefore = fake.drawings().length;
    const soundsBefore = fake.soundsPlayed().length;
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), "exit", "before the first portrait, the Exit Button");
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), portraitOf(PORTRAIT_COUNT), "then the last portrait");
    press(fake, "Next", true);
    assert.equal(currentPortrait(fake), "exit", "a held flipper keeps moving");
    press(fake, "Next", true);
    assert.equal(currentPortrait(fake), portraitOf(1));
    press(fake, "Next");
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(3));
    assert.deepEqual(fake.drawings().slice(drawingsBefore).filter(drawing => drawing.zIndex !== AVATAR_CHOICE_Z_INDEX.marker), [],
        "moving draws nothing but the marker");
    assert.equal(fake.soundsPlayed().length, soundsBefore + 6, "each move plays the navigation sound");

    // A held Select counts once: only its first press takes.
    press(fake, "Select", true);
    assert.equal(isAvatarChoiceOpen(fake), true, "a held Select takes nothing");
    assert.equal(press(fake, "Launch").defaultPrevented, true);
    assert.equal(isAvatarChoiceOpen(fake), false, "Launch takes the portrait at once");
    assert.equal(fake.files.readText(avatarPath), "portrait 3");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Maxx\\profile.json`), false, "no key is added");
    assert.equal(store.getActiveProfile().name, "Zed", "the active Profile is kept");
    assert.equal(highlighted(fake, names()), "Maxx", "the picker comes back on the new Profile");
    assert.ok(pickerAvatars(fake).includes(avatarPath), "wearing the portrait");

    // The held Launch picks nothing on the picker.
    press(fake, "Launch", true);
    assert.equal(store.getActiveProfile().name, "Zed");
    assert.ok(pickerTexts(fake).includes(lang.profiles.pickerTitle), "the picker is still open");

    assertNoErrorLogged(fake);
});
