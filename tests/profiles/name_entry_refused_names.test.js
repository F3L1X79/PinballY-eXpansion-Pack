// ============================================================
// Name Entry through main.js: each refused name, in any letter case, greys
// OK, says why and creates nothing; an empty name says nothing; a hyphen does
// nothing at the start or after another, and a trailing one is dropped.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, isNameEntryOpen, nameShown, reasonShown, currentCharacter, colorOf,
    enter, enterName, eraseName, moveTo, assertRefused, passThroughAvatarChoice, PROFILES_FOLDER,
} from "./name_entry_scenario.js";

const OK = "OK";

test("a refused name greys OK and says why; a hyphen stays inside the name", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice", "Zed"], activeProfile: "Zed" });
    const { refusals } = lang.profiles.nameEntry;
    const foldersBefore = fake.files.listFolders(PROFILES_FOLDER);

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    assert.equal(reasonShown(fake), "", "an empty name shows no reason");

    for (const name of ["guest", "GUEST", "Guest"]) assertRefused(fake, name, refusals.guest);
    for (const name of ["CON", "prn", "Aux", "nUL"]) assertRefused(fake, name, refusals.reserved);
    for (const name of ["Alice", "alice", "ZED"]) assertRefused(fake, name, refusals.taken);
    assert.deepEqual(fake.files.listFolders(PROFILES_FOLDER), foldersBefore, "nothing created");

    // A folder added in Windows while the screen is open: OK finds the name taken, with no error.
    enterName(fake, "Newt");
    fake.addFolder(`${PROFILES_FOLDER}\\newt`);
    moveTo(fake, OK);
    assert.equal(colorOf(fake, OK), STEAMBALL_COLORS.title, "still lit: the folders are read again on OK");
    press(fake, "Select");
    assert.equal(isNameEntryOpen(fake), true);
    assert.equal(reasonShown(fake), refusals.taken);
    assert.equal(colorOf(fake, OK), STEAMBALL_COLORS.dim);
    eraseName(fake);

    // The reason goes as soon as the name can be used, and comes back when it cannot.
    enterName(fake, "Alice");
    assert.equal(reasonShown(fake), refusals.taken);
    enter(fake, "s");
    assert.equal(reasonShown(fake), "");
    moveTo(fake, OK);
    assert.equal(colorOf(fake, OK), STEAMBALL_COLORS.title, "OK is lit again");
    eraseName(fake);

    // Only what changed is drawn: a character that changes no reason draws the name alone.
    enterName(fake, "Ab");
    const drawingsBefore = fake.drawings().length;
    press(fake, "Select");
    assert.equal(nameShown(fake), "Abb");
    assert.equal(fake.drawings().length, drawingsBefore + 1, "only the name is drawn again");
    eraseName(fake);

    // A hyphen at the start does nothing, and the cursor stays on it.
    enter(fake, "-");
    assert.equal(nameShown(fake), "");
    assert.equal(currentCharacter(fake), "-");

    // Nor right after another, and a trailing one is ignored by the checks.
    enterName(fake, "Alice-");
    assert.equal(nameShown(fake), "Alice-");
    assert.equal(reasonShown(fake), refusals.taken, "Alice- is checked as Alice");
    press(fake, "Select");
    assert.equal(nameShown(fake), "Alice-", "a second hyphen does nothing");
    eraseName(fake);

    // Inside a name it is kept; at the end it is dropped from what is created.
    enterName(fake, "Jo-Max-");
    assert.equal(reasonShown(fake), "");
    moveTo(fake, OK);
    assert.equal(colorOf(fake, OK), STEAMBALL_COLORS.title);
    press(fake, "Select");
    assert.equal(isNameEntryOpen(fake), false);
    assert.ok(fake.files.listFolders(PROFILES_FOLDER).includes("Jo-Max"), "created without its trailing hyphen");
    assert.equal(fake.files.listFolders(PROFILES_FOLDER).includes("Jo-Max-"), false);
    passThroughAvatarChoice(fake);
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Jo-Max", "Zed", lang.profiles.newProfile]), "Jo-Max", "the picker comes back on it");
    assert.equal(store.getActiveProfile().name, "Zed");

    assertNoErrorLogged(fake);
});
