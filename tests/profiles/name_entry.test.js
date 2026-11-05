// ============================================================
// Name Entry through main.js: the "+" opens it over the Profile picker; the
// flippers move along the ring without drawing; a name is built, erased and
// capped; OK creates an empty folder and the picker comes back on it with no
// switch. Exit returns to the "+" and attract mode closes all, nothing created.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { expectedButtonHints, buttonHintsOn } from "../support/button_hints_reader.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { NAME_ENTRY_Z_INDEX } from "../../common/profiles/name_entry_painter.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, isNameEntryOpen, nameEntryTexts, nameShown, currentCharacter, ringShown, colorOf,
    enter, enterName, moveTo, pickerTexts, passThroughAvatarChoice, PROFILES_FOLDER, NAME_ENTRY_OPEN_MS, GLIDE_OVER_MS,
} from "./name_entry_scenario.js";

const ERASE = String.fromCharCode(0x2190);
const OK = "OK";

test("a name built with the flippers creates an empty folder, and the picker comes back on it", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice", "Zed"], activeProfile: "Zed" });
    const label = lang.profiles.newProfile;
    const names = () => [lang.profiles.guestName, "Alice", "Maxx", "Zed", label];

    await openPicker();
    step(fake, "Next");
    assert.equal(highlighted(fake, names()), label);
    assert.equal(fake.fire("commandbuttondown", { command: "Select", repeat: false }).defaultPrevented, true);
    assert.equal(store.getActiveProfile().name, "Zed", "opening Name Entry picks nothing");
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
    assert.equal(isNameEntryOpen(fake), true);
    assert.ok(pickerTexts(fake).includes(lang.profiles.pickerTitle), "the Profile picker stays open under it");

    // What the screen shows.
    assert.deepEqual(nameEntryTexts(fake), [lang.profiles.nameEntry.title, ...lang.profiles.nameEntry.lines]);
    assert.deepEqual(buttonHintsOn(fake, NAME_ENTRY_Z_INDEX.buttonHints), expectedButtonHints(lang, { exit: "back" }));
    assert.equal(lang.buttonHints.back, "Back");

    // The ring and its cursor.
    assert.equal(currentCharacter(fake), "A", "the cursor opens on A");
    assert.deepEqual(ringShown(fake), ["-", ERASE, OK, "A", "B", "C", "D"], "the strip wraps round, A in the middle");
    assert.equal(colorOf(fake, OK), STEAMBALL_COLORS.dim, "OK is greyed on an empty name");
    const soundsBefore = fake.soundsPlayed().length;
    const drawingsBefore = fake.drawings().length;
    press(fake, "Prev");
    assert.equal(currentCharacter(fake), OK, "wraps from A back to OK");
    press(fake, "Prev");
    assert.equal(currentCharacter(fake), ERASE);
    press(fake, "Prev");
    assert.equal(currentCharacter(fake), "-");
    press(fake, "Prev");
    assert.equal(currentCharacter(fake), "z");
    press(fake, "Next", true);
    assert.equal(currentCharacter(fake), "-", "auto-repeat moves too");
    assert.equal(fake.drawings().length, drawingsBefore, "moving draws nothing");
    assert.equal(fake.soundsPlayed().length, soundsBefore + 5, "each move plays the navigation sound");

    // OK and the arrow do nothing on an empty name.
    enter(fake, OK);
    assert.equal(isNameEntryOpen(fake), true, "a greyed OK does nothing");
    assert.equal(fake.fileOperations().filter(({ path }) => path.includes("\\profiles\\")).length, 0);
    press(fake, "Prev");
    assert.equal(currentCharacter(fake), ERASE);
    const drawingsOnEmpty = fake.drawings().length;
    press(fake, "Select");
    assert.equal(nameShown(fake), "");
    assert.equal(fake.drawings().length, drawingsOnEmpty, "erasing an empty name draws nothing");

    // The cursor jumps to "a" after the first character, then stays put.
    enter(fake, "M");
    assert.equal(nameShown(fake), "M");
    assert.equal(currentCharacter(fake), "a", "from empty to one character, the cursor jumps to a");
    press(fake, "Select");
    assert.equal(nameShown(fake), "Ma");
    assert.equal(currentCharacter(fake), "a", "otherwise it stays put");
    press(fake, "Select", true);
    assert.equal(nameShown(fake), "Ma", "Select ignores auto-repeat");
    press(fake, "Launch");
    assert.equal(nameShown(fake), "Maa", "Launch chooses too");

    // The arrow erases the last character, and leaves the cursor on it.
    enter(fake, ERASE);
    assert.equal(nameShown(fake), "Ma");
    assert.equal(currentCharacter(fake), ERASE);

    // A 13th character is not added.
    enterName(fake, "xxxxxxxxxx");
    assert.equal(nameShown(fake), "Maxxxxxxxxxx");
    press(fake, "Select");
    assert.equal(nameShown(fake), "Maxxxxxxxxxx", "12 characters at most");
    assert.equal(nameShown(fake).length, 12);
    enter(fake, ERASE);
    for (let erased = 0; erased < 7; erased++) press(fake, "Select");
    assert.equal(nameShown(fake), "Maxx");

    moveTo(fake, OK);
    assert.equal(colorOf(fake, OK), STEAMBALL_COLORS.title, "OK is lit on a name");
    press(fake, "Select");
    assert.equal(isNameEntryOpen(fake), false, "OK closes Name Entry");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Maxx\\profile.json`), false, "no profile.json");
    assert.ok(store.listProfiles().some(profile => profile.name === "Maxx"), "the folder is there");
    passThroughAvatarChoice(fake);
    assert.equal(store.getActiveProfile().name, "Zed", "the active Profile is kept");
    assert.equal(highlighted(fake, names()), "Maxx", "the picker comes back on the new Profile");

    // Holding Exit on Avatar Choice must not close the picker.
    press(fake, "Exit", true);
    assert.ok(pickerTexts(fake).includes(lang.profiles.pickerTitle), "the held Exit's auto-repeat leaves the picker open");

    // In alphabetical place, the "+" still last.
    step(fake, "Prev");
    assert.equal(highlighted(fake, names()), "Alice");
    step(fake, "Next");
    step(fake, "Next");
    assert.equal(highlighted(fake, names()), "Zed");
    step(fake, "Next");
    assert.equal(highlighted(fake, names()), label);

    // Exit returns to the "+", with nothing created; the held Exit keeps the picker open.
    openNameEntry(fake);
    assert.equal(currentCharacter(fake), "A", "a new opening starts over");
    assert.equal(nameShown(fake), "");
    enter(fake, "Q");
    press(fake, "Exit", true);
    assert.equal(isNameEntryOpen(fake), true, "Exit ignores auto-repeat");
    press(fake, "Exit");
    assert.equal(isNameEntryOpen(fake), false);
    assert.equal(highlighted(fake, names()), label, "back on the +");
    press(fake, "Exit", true);
    assert.ok(pickerTexts(fake).includes(lang.profiles.pickerTitle), "the held Exit's auto-repeat leaves the picker open");
    assert.equal(store.listProfiles().some(profile => profile.name === "Q"), false, "nothing created");

    // Attract mode closes everything, with nothing created.
    openNameEntry(fake);
    enter(fake, "Q");
    fake.fire("attractmodestart");
    assert.equal(isNameEntryOpen(fake), false);
    assert.deepEqual(pickerTexts(fake), [], "the picker closes with it");
    assert.equal(store.listProfiles().some(profile => profile.name === "Q"), false, "nothing created");
    assert.equal(press(fake, "Next").defaultPrevented, false, "the buttons are back");
    fake.advanceTime(GLIDE_OVER_MS);

    assertNoErrorLogged(fake);
});
